import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function RaidEvent() {
  const [user, setUser] = useState(null);
  const [event, setEvent] = useState(null);
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [bosses, setBosses] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [lastAction, setLastAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [questing, setQuesting] = useState(false);
  const [attackingBossId, setAttackingBossId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadRaid();
  }, []);

  async function loadRaid() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw new Error(userError.message);

      if (!user) {
        setUser(null);
        setEvent(null);
        setMessage("You must be logged in to enter the raid.");
        return;
      }

      setUser(user);

      const now = new Date().toISOString();

      const { data: activeEvent, error: eventError } = await supabase
        .from("event_seasons")
        .select("*")
        .eq("event_type", "raid")
        .eq("status", "active")
        .lte("starts_at", now)
        .gt("ends_at", now)
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (eventError) throw new Error(eventError.message);

      if (!activeEvent) {
        setEvent(null);
        setMessage("No active raid event is live right now.");
        return;
      }

      setEvent(activeEvent);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw new Error(profileError.message);
      setProfile(profileData || null);

      const { data: progressData, error: progressError } = await supabase
        .from("player_event_progress")
        .select("*")
        .eq("event_id", activeEvent.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (progressError) throw new Error(progressError.message);
      setProgress(progressData || null);

      const { data: bossData, error: bossError } = await supabase
        .from("event_raid_bosses")
        .select("*")
        .eq("event_id", activeEvent.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("expires_at", now)
        .order("spawned_at", { ascending: true });

      if (bossError) throw new Error(bossError.message);
      setBosses(bossData || []);

      const { data: rankingData, error: rankingError } = await supabase
        .from("player_event_progress")
        .select("*")
        .eq("event_id", activeEvent.id)
        .gt("event_rank_score", 0)
        .order("event_rank_score", { ascending: false })
        .order("updated_at", { ascending: true })
        .limit(50);

      if (rankingError) throw new Error(rankingError.message);
      setRankings(rankingData || []);

      const { data: rewardData, error: rewardError } = await supabase
        .from("event_rank_rewards")
        .select("*")
        .eq("event_id", activeEvent.id)
        .order("min_rank", { ascending: true });

      if (rewardError) throw new Error(rewardError.message);
      setRewards(rewardData || []);
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Could not load raid event.");
    } finally {
      setLoading(false);
    }
  }

  async function getActiveDeckPower() {
    if (!user) throw new Error("Not logged in.");

    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (deckError) throw new Error(deckError.message);
    if (!deck) throw new Error("You need an active deck before attacking.");

    const possibleSlotFields = [
      "card_1_id",
      "card_2_id",
      "card_3_id",
      "card_4_id",
      "card_5_id",
    ];

    let playerCardIds = possibleSlotFields
      .map((field) => deck[field])
      .filter(Boolean);

    if (Array.isArray(deck.card_ids) && deck.card_ids.length) {
      playerCardIds = deck.card_ids.filter(Boolean);
    }

    if (!playerCardIds.length) {
      throw new Error("Your active deck has no cards.");
    }

    const { data: playerCards, error: cardError } = await supabase
      .from("player_cards")
      .select("*")
      .in("id", playerCardIds);

    if (cardError) throw new Error(cardError.message);
    if (!playerCards?.length) throw new Error("Could not load deck cards.");

    const baseCardIds = [
      ...new Set(
        playerCards.map((playerCard) => playerCard.card_id).filter(Boolean)
      ),
    ];

    let baseCardById = new Map();

    if (baseCardIds.length) {
      const { data: baseCards, error: baseCardError } = await supabase
        .from("cards")
        .select("*")
        .in("id", baseCardIds);

      if (baseCardError) throw new Error(baseCardError.message);

      baseCardById = new Map((baseCards || []).map((card) => [card.id, card]));
    }

    const deckPower = playerCards.reduce((sum, playerCard) => {
      const card = baseCardById.get(playerCard.card_id) || {};
      const level = Number(playerCard.level || 1);

      const atk = Number(
        playerCard.attack ??
          playerCard.atk ??
          card.attack ??
          card.atk ??
          card.base_attack ??
          card.base_atk ??
          0
      );

      const def = Number(
        playerCard.defense ??
          playerCard.def ??
          card.defense ??
          card.def ??
          card.base_defense ??
          card.base_def ??
          0
      );

      const levelMultiplier = 1 + Math.max(level - 1, 0) * 0.07;

      return sum + Math.floor((atk * 2 + def) * levelMultiplier);
    }, 0);

    if (!deckPower || deckPower <= 0) {
      throw new Error("Your active deck has no usable attack power.");
    }

    return Math.max(deckPower, 1);
  }

  async function continueQuest() {
    try {
      setQuesting(true);
      setMessage("");
      setLastAction(null);

      if (!event?.id) throw new Error("No active raid event found.");

      const { data, error } = await supabase.rpc("advance_event_quest", {
        p_event_id: event.id,
      });

      if (error) throw new Error(error.message);

      if (data?.spawned_boss_id) {
        setLastAction(data);
        setMessage(
          `${data.spawned_boss_name} appeared! It has ${Number(
            data.spawned_boss_hp || 0
          ).toLocaleString()} HP.`
        );
      } else {
        setMessage("Quest cleared. You pushed deeper into the rift.");
      }

      await loadRaid();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Could not continue quest.");
    } finally {
      setQuesting(false);
    }
  }

  async function attackBoss(boss) {
    try {
      setAttackingBossId(boss.id);
      setMessage("");
      setLastAction(null);

      if (!event?.id) throw new Error("No active raid event found.");

      const deckPower = await getActiveDeckPower();
      const roll = 0.85 + Math.random() * 0.3;
      const crit = Math.random() < 0.12 ? 1.5 : 1;
      const damage = Math.max(1, Math.floor(deckPower * roll * crit));

      const { data, error } = await supabase.rpc("attack_event_raid_boss", {
        p_event_id: event.id,
        p_boss_id: boss.id,
        p_damage: damage,
      });

      if (error) throw new Error(error.message);

      setLastAction(data);

      if (data?.defeated) {
        setMessage(
          `${boss.boss_name} defeated! +${Number(
            data.score_gain || 0
          ).toLocaleString()} rank points.`
        );
      } else {
        setMessage(
          `Attack landed for ${Number(
            data.damage || 0
          ).toLocaleString()} damage.`
        );
      }

      await loadRaid();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Raid attack failed.");
    } finally {
      setAttackingBossId(null);
    }
  }

  async function claimReward() {
    try {
      setMessage("");

      if (!event?.id) throw new Error("No raid event found.");

      const { data, error } = await supabase.rpc("claim_raid_rank_reward", {
        p_event_id: event.id,
      });

      if (error) throw new Error(error.message);

      setMessage(
        `Reward claimed. Final Rank: #${data.rank}. Gold +${data.gold_added}, Gems +${data.gems_added}.`
      );

      await loadRaid();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Could not claim reward.");
    }
  }

  const myRank = useMemo(() => {
    if (!user || !rankings.length) return null;

    const index = rankings.findIndex((row) => row.user_id === user.id);
    return index >= 0 ? index + 1 : null;
  }, [rankings, user]);

  const raidEnded = event ? new Date(event.ends_at) <= new Date() : false;
  const questSteps = Number(event?.quest_steps_per_lap || 10);
  const questNumber = Number(progress?.quest_number || 1);
  const questLap = Number(progress?.quest_lap || 1);
  const queueCap = Number(event?.raid_queue_cap || 3);
  const queueFull = bosses.length >= queueCap;
  const finalBossActive = bosses.some((boss) => boss.boss_type === "final");
  const questPercent = Math.min(100, Math.floor((questNumber / questSteps) * 100));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        Loading raid...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <h1 className="text-3xl font-bold mb-3">Raid Event</h1>
        <p className="text-slate-300">{message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pb-28">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border border-purple-500/30 bg-slate-900 p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-purple-300 text-sm uppercase tracking-widest">
                Weekend Raid Loop Test
              </p>
              <h1 className="text-4xl font-bold mt-1">{event.name}</h1>
              <p className="text-slate-300 mt-2">{event.description}</p>
            </div>

            <div className="text-right">
              <p className="text-slate-400 text-sm">Ends</p>
              <p className="text-lg font-semibold">
                {new Date(event.ends_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-200">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 rounded-2xl border border-purple-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-6">
            <p className="text-purple-300 text-sm uppercase tracking-widest">
              Event Quest
            </p>

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mt-2">
              <div>
                <h2 className="text-3xl font-bold">
                  Rift Path — Quest {questNumber}/{questSteps}
                </h2>
                <p className="text-slate-400 mt-1">
                  Loop {questLap} · Floor {progress?.quest_floor || 1}
                </p>
              </div>

              <div className="text-left md:text-right">
                <p className="text-slate-400 text-sm">Boss Queue</p>
                <p className={`text-xl font-bold ${queueFull ? "text-red-300" : "text-white"}`}>
                  {bosses.length}/{queueCap}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Quest Progress</span>
                <span>{questPercent}%</span>
              </div>

              <div className="h-5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all"
                  style={{ width: `${questPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Rank"
                value={myRank ? `#${myRank}` : "Unranked"}
              />
              <StatCard
                label="Score"
                value={Number(progress?.event_rank_score || 0).toLocaleString()}
              />
              <StatCard
                label="Damage"
                value={Number(progress?.total_damage_dealt || 0).toLocaleString()}
              />
              <StatCard
                label="Final Clears"
                value={Number(progress?.final_bosses_defeated || 0).toLocaleString()}
              />
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Stamina"
                value={`${profile?.stamina ?? "?"}/${profile?.max_stamina ?? "?"}`}
              />
              <StatCard
                label="Attack Energy"
                value={`${profile?.attack_energy ?? "?"}/${profile?.max_attack_energy ?? "?"}`}
              />
              <StatCard
                label="Bosses Spawned"
                value={Number(progress?.raid_bosses_spawned || 0).toLocaleString()}
              />
              <StatCard
                label="Bosses Defeated"
                value={Number(progress?.raid_bosses_defeated || 0).toLocaleString()}
              />
            </div>

            {queueFull && (
              <div className="mt-6 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-red-100">
                Your raid boss queue is full. Defeat a boss or wait for one to
                expire before continuing quests.
              </div>
            )}

            {finalBossActive && (
              <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-4 text-yellow-100">
                A final raid boss is active. Defeat it to reset back to Quest 1
                and begin the next loop.
              </div>
            )}

            <button
              onClick={continueQuest}
              disabled={questing || raidEnded || queueFull || finalBossActive}
              className="mt-8 w-full rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed px-6 py-4 font-bold text-lg"
            >
              {questing
                ? "Questing..."
                : `Continue Quest - ${event.quest_stamina_cost || 2} Stamina`}
            </button>
          </section>

          <aside className="rounded-2xl border border-yellow-500/30 bg-slate-900 p-6">
            <h3 className="text-2xl font-bold mb-4">Rank Rewards</h3>

            <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="rounded-xl bg-slate-950 border border-slate-700 p-4"
                >
                  <p className="font-bold text-yellow-300">
                    Rank {reward.min_rank}
                    {reward.max_rank !== reward.min_rank
                      ? ` - ${reward.max_rank}`
                      : ""}
                  </p>
                  <p className="text-slate-200 mt-1">{reward.reward_name}</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Gold: {reward.reward_json?.gold || 0} · Gems:{" "}
                    {reward.reward_json?.gems || 0}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={claimReward}
              disabled={!raidEnded}
              className="mt-6 w-full rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-black disabled:text-slate-300 px-4 py-3 font-bold"
            >
              {raidEnded ? "Claim Rank Reward" : "Rewards Unlock After Event"}
            </button>
          </aside>
        </div>

        <section className="rounded-2xl border border-red-500/30 bg-slate-900 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <div>
              <p className="text-red-300 text-sm uppercase tracking-widest">
                Raid Boss Queue
              </p>
              <h3 className="text-2xl font-bold">
                Active Bosses {bosses.length}/{queueCap}
              </h3>
            </div>

            <p className="text-slate-400 text-sm">
              Normal bosses expire in {event.normal_boss_expires_minutes || 30} min ·
              Final bosses expire in {event.final_boss_expires_minutes || 60} min
            </p>
          </div>

          {bosses.length ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {bosses.map((boss) => (
                <BossCard
                  key={boss.id}
                  boss={boss}
                  onAttack={() => attackBoss(boss)}
                  attacking={attackingBossId === boss.id}
                  attackCost={event.raid_attack_energy_cost || 5}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-6 text-slate-300">
              No raid bosses in your queue. Continue quests to spawn one.
            </div>
          )}
        </section>

        {lastAction && (
          <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="text-xl font-bold mb-2">Last Action</h3>
            <p className="text-slate-300 text-sm">
              Damage: {Number(lastAction.damage || 0).toLocaleString()} · Score
              Gain: {Number(lastAction.score_gain || 0).toLocaleString()} · Bonus:
              {Number(lastAction.bonus_points || 0).toLocaleString()}
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <h3 className="text-2xl font-bold mb-4">Raid Rankings</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="py-3">Rank</th>
                  <th className="py-3">Player</th>
                  <th className="py-3">Score</th>
                  <th className="py-3">Damage</th>
                  <th className="py-3">Bosses</th>
                  <th className="py-3">Finals</th>
                </tr>
              </thead>

              <tbody>
                {rankings.map((row, index) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-800 text-slate-200"
                  >
                    <td className="py-3 font-bold">#{index + 1}</td>
                    <td className="py-3">
                      {row.created_by || row.user_id}
                      {row.user_id === user?.id && (
                        <span className="ml-2 text-purple-300">(You)</span>
                      )}
                    </td>
                    <td className="py-3">
                      {Number(row.event_rank_score || 0).toLocaleString()}
                    </td>
                    <td className="py-3">
                      {Number(row.total_damage_dealt || 0).toLocaleString()}
                    </td>
                    <td className="py-3">
                      {Number(row.raid_bosses_defeated || row.total_bosses_killed || 0).toLocaleString()}
                    </td>
                    <td className="py-3">
                      {Number(row.final_bosses_defeated || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {!rankings.length && (
                  <tr>
                    <td className="py-6 text-slate-400" colSpan="6">
                      No raid rankings yet. Start questing to climb the board.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function BossCard({ boss, onAttack, attacking, attackCost }) {
  const hpPercent = Math.max(
    0,
    Math.min(100, Math.floor((Number(boss.current_hp || 0) / Number(boss.max_hp || 1)) * 100))
  );

  const expiresAt = boss.expires_at ? new Date(boss.expires_at) : null;
  const expiresText = expiresAt ? expiresAt.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  }) : "Soon";

  const isFinal = boss.boss_type === "final";

  return (
    <div
      className={`rounded-2xl border p-5 bg-slate-950 ${
        isFinal ? "border-yellow-500/40" : "border-red-500/30"
      }`}
    >
      <p
        className={`text-xs uppercase tracking-widest ${
          isFinal ? "text-yellow-300" : "text-red-300"
        }`}
      >
        {isFinal ? "Final Boss" : "Raid Boss"}
      </p>

      <h4 className="text-xl font-bold mt-1">{boss.boss_name}</h4>

      <p className="text-slate-400 text-sm mt-1">
        Loop {boss.lap_number || 1} · Quest {boss.quest_number || 1}
      </p>

      <div className="mt-5">
        <div className="flex justify-between text-sm mb-2">
          <span>HP</span>
          <span>
            {Number(boss.current_hp || 0).toLocaleString()} /{" "}
            {Number(boss.max_hp || 0).toLocaleString()}
          </span>
        </div>

        <div className="h-4 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all ${
              isFinal ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      <p className="text-slate-400 text-xs mt-3">Expires at {expiresText}</p>

      <button
        onClick={onAttack}
        disabled={attacking}
        className={`mt-5 w-full rounded-xl px-4 py-3 font-bold disabled:bg-slate-700 disabled:cursor-not-allowed ${
          isFinal
            ? "bg-yellow-500 hover:bg-yellow-400 text-black"
            : "bg-red-600 hover:bg-red-500 text-white"
        }`}
      >
        {attacking ? "Attacking..." : `Attack - ${attackCost} ATK`}
      </button>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-950 border border-slate-700 p-4">
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}