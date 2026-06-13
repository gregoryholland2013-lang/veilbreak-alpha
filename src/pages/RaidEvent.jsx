import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Clock,
  Crown,
  Flame,
  ScrollText,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
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

  async function loadRaid({ silent = false } = {}) {
    if (!silent) {
      setLoading(true);
      setMessage("");
    }

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
    if (!playerCards?.length) {
      throw new Error("Could not load deck cards.");
    }

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
          `${data.spawned_boss_name} appeared! ${Number(
            data.spawned_boss_hp || 0
          ).toLocaleString()} HP blocks your path.`
        );
      } else {
        setMessage("Quest cleared. The rift path opens further.");
      }

      await loadRaid({ silent: true });
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
          `Attack landed for ${Number(data.damage || 0).toLocaleString()} damage.`
        );
      }

      await loadRaid({ silent: true });
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

      await loadRaid({ silent: true });
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

  const questPercent = Math.min(
    100,
    Math.floor((questNumber / questSteps) * 100)
  );

  const continueDisabledReason = raidEnded
    ? "Event ended"
    : finalBossActive
      ? "Defeat the final boss to reset"
      : queueFull
        ? "Boss queue full"
        : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-purple-400 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-purple-200 font-bold tracking-widest uppercase text-sm">
            Opening Rift...
          </p>
        </div>
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
    <div className="relative min-h-screen overflow-hidden bg-[#050713] text-white p-4 md:p-6 pb-28">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-purple-700/30 blur-3xl" />
        <div className="absolute top-40 -right-24 w-96 h-96 rounded-full bg-red-700/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[520px] h-[520px] rounded-full bg-yellow-500/10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto space-y-6">
        <EventHero event={event} progress={progress} myRank={myRank} />

        {message && (
          <div className="rounded-2xl border border-purple-400/30 bg-purple-950/30 px-5 py-4 text-purple-50 shadow-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-300 mt-0.5 flex-shrink-0" />
              <p className="font-semibold">{message}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-8 rounded-3xl border border-purple-500/30 bg-slate-950/80 shadow-2xl overflow-hidden">
            <div className="relative p-5 md:p-7">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-red-600/10" />

              <div className="relative">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-2 text-purple-300 uppercase tracking-[0.25em] text-xs font-bold">
                      <ScrollText className="w-4 h-4" />
                      Event Quest
                    </div>

                    <h2 className="text-3xl md:text-4xl font-black mt-3">
                      Rift Path
                    </h2>

                    <p className="text-slate-300 mt-2">
                      Quest{" "}
                      <span className="text-white font-bold">
                        {questNumber}/{questSteps}
                      </span>{" "}
                      <span className="text-slate-500">·</span> Loop{" "}
                      <span className="text-white font-bold">{questLap}</span>{" "}
                      <span className="text-slate-500">·</span> Floor{" "}
                      <span className="text-white font-bold">
                        {progress?.quest_floor || 1}
                      </span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 min-w-[220px]">
                    <MiniPanel
                      icon={Skull}
                      label="Boss Queue"
                      value={`${bosses.length}/${queueCap}`}
                      danger={queueFull}
                    />
                    <MiniPanel
                      icon={Trophy}
                      label="Rank"
                      value={myRank ? `#${myRank}` : "—"}
                    />
                  </div>
                </div>

                <QuestPath
                  questNumber={questNumber}
                  questSteps={questSteps}
                  bossEvery={Number(event?.regular_boss_every_steps || 3)}
                />

                <div className="mt-6">
                  <div className="flex justify-between text-xs uppercase tracking-widest text-slate-400 mb-2">
                    <span>Quest Progress</span>
                    <span>{questPercent}%</span>
                  </div>

                  <div className="h-4 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-yellow-400 transition-all"
                      style={{ width: `${questPercent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    icon={Trophy}
                    label="Score"
                    value={Number(
                      progress?.event_rank_score || 0
                    ).toLocaleString()}
                  />
                  <StatCard
                    icon={Swords}
                    label="Damage"
                    value={Number(
                      progress?.total_damage_dealt || 0
                    ).toLocaleString()}
                  />
                  <StatCard
                    icon={Crown}
                    label="Final Clears"
                    value={Number(
                      progress?.final_bosses_defeated || 0
                    ).toLocaleString()}
                  />
                  <StatCard
                    icon={Shield}
                    label="Bosses Defeated"
                    value={Number(
                      progress?.raid_bosses_defeated || 0
                    ).toLocaleString()}
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ResourceCard
                    label="Stamina"
                    value={profile?.stamina ?? "?"}
                    max={profile?.max_stamina ?? "?"}
                    accent="purple"
                  />
                  <ResourceCard
                    label="Attack Energy"
                    value={profile?.attack_energy ?? "?"}
                    max={profile?.max_attack_energy ?? "?"}
                    accent="red"
                  />
                  <StatCard
                    icon={Flame}
                    label="Spawned"
                    value={Number(
                      progress?.raid_bosses_spawned || 0
                    ).toLocaleString()}
                  />
                  <StatCard
                    icon={Timer}
                    label="Expires"
                    value={`${event.normal_boss_expires_minutes || 30}m`}
                  />
                </div>

                {(queueFull || finalBossActive) && (
                  <div className="mt-6 rounded-2xl border border-yellow-400/30 bg-yellow-950/20 p-4">
                    <div className="flex gap-3">
                      <Flame className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-yellow-100">
                          {queueFull
                            ? "Raid queue is full."
                            : "Final boss is blocking the rift."}
                        </p>
                        <p className="text-sm text-yellow-100/70 mt-1">
                          {queueFull
                            ? "Defeat a boss or wait for one to expire before continuing quests."
                            : "Defeat the final boss to reset to Quest 1 and begin the next loop."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={continueQuest}
                  disabled={questing || raidEnded || queueFull || finalBossActive}
                  className="group mt-7 w-full rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-500 hover:from-purple-500 hover:via-fuchsia-500 hover:to-yellow-500 disabled:from-slate-700 disabled:via-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed px-6 py-5 font-black text-lg shadow-xl shadow-purple-950/40 transition-all"
                >
                  <span className="flex items-center justify-center gap-2">
                    {questing
                      ? "Pushing Through The Rift..."
                      : continueDisabledReason ||
                        `Continue Quest - ${
                          event.quest_stamina_cost || 2
                        } Stamina`}

                    {!questing && !continueDisabledReason && (
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    )}
                  </span>
                </button>
              </div>
            </div>
          </section>

          <aside className="xl:col-span-4 rounded-3xl border border-yellow-500/30 bg-slate-950/80 shadow-2xl overflow-hidden">
            <div className="p-5 md:p-6 border-b border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-yellow-300 uppercase tracking-[0.25em] text-xs font-bold">
                    <Trophy className="w-4 h-4" />
                    Ranking
                  </div>
                  <h3 className="text-2xl font-black mt-2">Rank Rewards</h3>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-yellow-300" />
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6 space-y-3">
              {rewards.map((reward) => (
                <RewardCard key={reward.id} reward={reward} />
              ))}

              <button
                onClick={claimReward}
                disabled={!raidEnded}
                className="mt-4 w-full rounded-2xl bg-yellow-400 hover:bg-yellow-300 disabled:bg-slate-700 disabled:cursor-not-allowed text-black disabled:text-slate-300 px-4 py-4 font-black shadow-lg"
              >
                {raidEnded ? "Claim Rank Reward" : "Rewards Unlock After Event"}
              </button>
            </div>
          </aside>
        </div>

        <section className="rounded-3xl border border-red-500/30 bg-slate-950/80 shadow-2xl overflow-hidden">
          <div className="p-5 md:p-6 border-b border-red-500/20 bg-red-500/5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-red-300 uppercase tracking-[0.25em] text-xs font-bold">
                  <Skull className="w-4 h-4" />
                  Raid Boss Queue
                </div>
                <h3 className="text-2xl md:text-3xl font-black mt-2">
                  Active Threats {bosses.length}/{queueCap}
                </h3>
              </div>

              <p className="text-slate-400 text-sm">
                Normal bosses expire in{" "}
                {event.normal_boss_expires_minutes || 30}m · Final bosses
                expire in {event.final_boss_expires_minutes || 60}m
              </p>
            </div>
          </div>

          <div className="p-5 md:p-6">
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
              <EmptyBossQueue />
            )}
          </div>
        </section>

        {lastAction && (
          <section className="rounded-3xl border border-purple-500/20 bg-slate-950/70 p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-purple-300 uppercase tracking-[0.25em] text-xs font-bold">
                  Last Action
                </p>
                <h3 className="text-xl font-black mt-1">Combat Result</h3>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <MiniResult
                  label="Damage"
                  value={Number(lastAction.damage || 0).toLocaleString()}
                />
                <MiniResult
                  label="Score"
                  value={Number(lastAction.score_gain || 0).toLocaleString()}
                />
                <MiniResult
                  label="Bonus"
                  value={Number(lastAction.bonus_points || 0).toLocaleString()}
                />
              </div>
            </div>
          </section>
        )}

        <RankingTable rankings={rankings} user={user} />
      </div>
    </div>
  );
}

function EventHero({ event, progress, myRank }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-slate-950/90 shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-700/25 via-slate-950 to-red-700/20" />
      <div className="absolute right-8 top-1/2 -translate-y-1/2 w-52 h-52 rounded-full bg-purple-500/20 blur-3xl" />

      <div className="relative p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-purple-300 uppercase tracking-[0.3em] text-xs font-bold">
              <Flame className="w-4 h-4" />
              Weekend Raid Loop Test
            </div>

            <h1 className="text-4xl md:text-6xl font-black mt-3 tracking-tight">
              {event.name}
            </h1>

            <p className="text-slate-300 mt-3 max-w-3xl text-base md:text-lg">
              {event.description}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:min-w-[360px]">
            <HeroBadge label="Rank" value={myRank ? `#${myRank}` : "—"} />
            <HeroBadge
              label="Loop"
              value={Number(progress?.quest_lap || 1).toLocaleString()}
            />
            <HeroBadge
              label="Ends"
              value={new Date(event.ends_at).toLocaleDateString([], {
                month: "numeric",
                day: "numeric",
              })}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function QuestPath({ questNumber, questSteps, bossEvery }) {
  const nodes = Array.from({ length: questSteps }, (_, index) => index + 1);

  return (
    <div className="mt-7 rounded-3xl border border-slate-700/70 bg-slate-950/70 p-4">
      <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
        {nodes.map((node) => {
          const isCompleted = node < questNumber;
          const isCurrent = node === questNumber;
          const isFinal = node === questSteps;
          const isBoss = !isFinal && node % bossEvery === 0;

          return (
            <div key={node} className="relative flex flex-col items-center">
              <div
                className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-black transition-all ${
                  isCurrent
                    ? "bg-purple-500 border-purple-300 text-white shadow-lg shadow-purple-500/30 scale-110"
                    : isCompleted
                      ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                      : isFinal
                        ? "bg-yellow-500/10 border-yellow-400/40 text-yellow-300"
                        : isBoss
                          ? "bg-red-500/10 border-red-400/40 text-red-300"
                          : "bg-slate-900 border-slate-700 text-slate-400"
                }`}
              >
                {isFinal ? (
                  <Crown className="w-5 h-5" />
                ) : isBoss ? (
                  <Skull className="w-5 h-5" />
                ) : (
                  node
                )}
              </div>

              <p className="text-[10px] text-slate-500 mt-2">
                {isFinal ? "Final" : isBoss ? "Boss" : `Q${node}`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BossCard({ boss, onAttack, attacking, attackCost }) {
  const hpPercent = Math.max(
    0,
    Math.min(
      100,
      Math.floor(
        (Number(boss.current_hp || 0) / Number(boss.max_hp || 1)) * 100
      )
    )
  );

  const expiresAt = boss.expires_at ? new Date(boss.expires_at) : null;
  const expiresText = expiresAt
    ? expiresAt.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "Soon";

  const isFinal = boss.boss_type === "final";

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border p-5 ${
        isFinal
          ? "border-yellow-400/40 bg-yellow-950/10"
          : "border-red-500/30 bg-red-950/10"
      }`}
    >
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${
          isFinal
            ? "bg-gradient-to-br from-yellow-500/10 to-transparent"
            : "bg-gradient-to-br from-red-500/10 to-transparent"
        }`}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className={`text-xs uppercase tracking-[0.25em] font-bold ${
                isFinal ? "text-yellow-300" : "text-red-300"
              }`}
            >
              {isFinal ? "Final Boss" : "Raid Boss"}
            </p>

            <h4 className="text-2xl font-black mt-2">{boss.boss_name}</h4>

            <p className="text-slate-400 text-sm mt-1">
              Loop {boss.lap_number || 1} · Quest {boss.quest_number || 1}
            </p>
          </div>

          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${
              isFinal
                ? "border-yellow-400/40 bg-yellow-400/10"
                : "border-red-400/40 bg-red-400/10"
            }`}
          >
            {isFinal ? (
              <Crown className="w-6 h-6 text-yellow-300" />
            ) : (
              <Skull className="w-6 h-6 text-red-300" />
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">HP</span>
            <span className="font-bold">
              {Number(boss.current_hp || 0).toLocaleString()} /{" "}
              {Number(boss.max_hp || 0).toLocaleString()}
            </span>
          </div>

          <div className="h-4 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
            <div
              className={`h-full transition-all ${
                isFinal
                  ? "bg-gradient-to-r from-yellow-500 to-orange-400"
                  : "bg-gradient-to-r from-red-600 to-fuchsia-500"
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-slate-400 text-xs">
          <Clock className="w-4 h-4" />
          Expires at {expiresText}
        </div>

        <button
          onClick={onAttack}
          disabled={attacking}
          className={`mt-5 w-full rounded-2xl px-4 py-4 font-black disabled:bg-slate-700 disabled:cursor-not-allowed transition-all ${
            isFinal
              ? "bg-yellow-400 hover:bg-yellow-300 text-black shadow-lg shadow-yellow-950/30"
              : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/40"
          }`}
        >
          {attacking ? "Attacking..." : `Attack - ${attackCost} ATK`}
        </button>
      </div>
    </div>
  );
}

function RewardCard({ reward }) {
  const isTop = reward.min_rank === 1;

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isTop
          ? "border-yellow-400/40 bg-yellow-400/10"
          : "border-slate-700 bg-slate-950/70"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-black text-yellow-300">
            Rank {reward.min_rank}
            {reward.max_rank !== reward.min_rank ? ` - ${reward.max_rank}` : ""}
          </p>
          <p className="text-slate-100 font-bold mt-1">{reward.reward_name}</p>
        </div>

        {isTop && <Crown className="w-6 h-6 text-yellow-300" />}
      </div>

      <div className="mt-3 flex gap-2 text-xs">
        <span className="rounded-full bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 text-yellow-100">
          Gold {reward.reward_json?.gold || 0}
        </span>
        <span className="rounded-full bg-cyan-400/10 border border-cyan-400/20 px-3 py-1 text-cyan-100">
          Gems {reward.reward_json?.gems || 0}
        </span>
      </div>
    </div>
  );
}

function RankingTable({ rankings, user }) {
  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-950/80 shadow-2xl overflow-hidden">
      <div className="p-5 md:p-6 border-b border-slate-700 bg-slate-900/60">
        <div className="flex items-center gap-2 text-purple-300 uppercase tracking-[0.25em] text-xs font-bold">
          <Trophy className="w-4 h-4" />
          Leaderboard
        </div>
        <h3 className="text-2xl md:text-3xl font-black mt-2">Raid Rankings</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-400 border-b border-slate-800 bg-slate-950">
              <th className="py-4 px-5">Rank</th>
              <th className="py-4 px-5">Player</th>
              <th className="py-4 px-5">Score</th>
              <th className="py-4 px-5">Damage</th>
              <th className="py-4 px-5">Bosses</th>
              <th className="py-4 px-5">Finals</th>
            </tr>
          </thead>

          <tbody>
            {rankings.map((row, index) => (
              <tr
                key={row.id}
                className={`border-b border-slate-900 text-slate-200 ${
                  row.user_id === user?.id ? "bg-purple-500/10" : ""
                }`}
              >
                <td className="py-4 px-5 font-black text-yellow-300">
                  #{index + 1}
                </td>
                <td className="py-4 px-5">
                  <span className="font-bold">{row.created_by || row.user_id}</span>
                  {row.user_id === user?.id && (
                    <span className="ml-2 text-purple-300">(You)</span>
                  )}
                </td>
                <td className="py-4 px-5 font-bold">
                  {Number(row.event_rank_score || 0).toLocaleString()}
                </td>
                <td className="py-4 px-5">
                  {Number(row.total_damage_dealt || 0).toLocaleString()}
                </td>
                <td className="py-4 px-5">
                  {Number(
                    row.raid_bosses_defeated || row.total_bosses_killed || 0
                  ).toLocaleString()}
                </td>
                <td className="py-4 px-5">
                  {Number(row.final_bosses_defeated || 0).toLocaleString()}
                </td>
              </tr>
            ))}

            {!rankings.length && (
              <tr>
                <td className="py-8 px-5 text-slate-400" colSpan="6">
                  No raid rankings yet. Start questing to climb the board.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EmptyBossQueue() {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-8 text-center">
      <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-400/20 flex items-center justify-center mx-auto">
        <ScrollText className="w-8 h-8 text-purple-300" />
      </div>
      <h4 className="text-2xl font-black mt-4">The path is clear</h4>
      <p className="text-slate-400 mt-2">
        Continue quests to uncover raid bosses and push your ranking score higher.
      </p>
    </div>
  );
}

function HeroBadge({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur">
      <p className="text-[10px] uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="text-xl font-black mt-1">{value}</p>
    </div>
  );
}

function MiniPanel({ icon: Icon, label, value, danger = false }) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        danger
          ? "border-red-400/40 bg-red-500/10"
          : "border-slate-700 bg-slate-950/70"
      }`}
    >
      <div className="flex items-center gap-2 text-slate-400 text-xs">
        <Icon
          className={`w-4 h-4 ${danger ? "text-red-300" : "text-purple-300"}`}
        />
        {label}
      </div>
      <p className={`text-2xl font-black mt-1 ${danger ? "text-red-200" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-slate-950/80 border border-slate-700 p-4">
      <div className="flex items-center gap-2 text-slate-400 text-xs">
        <Icon className="w-4 h-4 text-purple-300" />
        {label}
      </div>
      <p className="text-xl md:text-2xl font-black mt-2">{value}</p>
    </div>
  );
}

function ResourceCard({ label, value, max, accent }) {
  const numericValue = Number(value || 0);
  const numericMax = Number(max || 1);
  const percent = Math.max(
    0,
    Math.min(100, Math.floor((numericValue / numericMax) * 100))
  );

  const barClass =
    accent === "red"
      ? "bg-gradient-to-r from-red-600 to-orange-400"
      : "bg-gradient-to-r from-purple-600 to-fuchsia-400";

  return (
    <div className="rounded-2xl bg-slate-950/80 border border-slate-700 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-slate-400 text-xs">{label}</p>
        <Zap
          className={
            accent === "red"
              ? "w-4 h-4 text-red-300"
              : "w-4 h-4 text-purple-300"
          }
        />
      </div>

      <p className="text-xl md:text-2xl font-black mt-2">
        {value}/{max}
      </p>

      <div className="h-2 rounded-full bg-slate-800 overflow-hidden mt-3">
        <div className={`h-full ${barClass}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function MiniResult({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 min-w-[95px]">
      <p className="text-[10px] uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}