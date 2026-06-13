import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function RaidEvent() {
  const [user, setUser] = useState(null);
  const [event, setEvent] = useState(null);
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [globalDamage, setGlobalDamage] = useState(0);
  const [lastHit, setLastHit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attacking, setAttacking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadRaid();
  }, []);

  async function loadRaid() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("You must be logged in to enter the raid.");
      setLoading(false);
      return;
    }

    setUser(user);

    const { data: activeEvent, error: eventError } = await supabase
      .from("event_seasons")
      .select("*")
      .eq("event_type", "raid")
      .eq("status", "active")
      .lte("starts_at", new Date().toISOString())
      .gt("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (eventError) {
      setMessage(eventError.message);
      setLoading(false);
      return;
    }

    if (!activeEvent) {
      setMessage("No active raid event is live right now.");
      setLoading(false);
      return;
    }

    setEvent(activeEvent);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    setProfile(profileData || null);

    const { data: progressData } = await supabase
      .from("player_event_progress")
      .select("*")
      .eq("event_id", activeEvent.id)
      .eq("user_id", user.id)
      .maybeSingle();

    setProgress(progressData || null);

    const { data: rankingData } = await supabase
      .from("player_event_progress")
      .select("*")
      .eq("event_id", activeEvent.id)
      .gt("event_rank_score", 0)
      .order("event_rank_score", { ascending: false })
      .order("updated_at", { ascending: true })
      .limit(50);

    setRankings(rankingData || []);

    const { data: rewardData } = await supabase
      .from("event_rank_rewards")
      .select("*")
      .eq("event_id", activeEvent.id)
      .order("min_rank", { ascending: true });

    setRewards(rewardData || []);

    const { data: allProgress } = await supabase
      .from("player_event_progress")
      .select("total_damage_dealt")
      .eq("event_id", activeEvent.id);

    const total = (allProgress || []).reduce(
      (sum, row) => sum + Number(row.total_damage_dealt || 0),
      0
    );

    setGlobalDamage(total);
    setLoading(false);
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

    if (Array.isArray(deck.card_ids)) {
      playerCardIds = deck.card_ids.filter(Boolean);
    }

    if (!playerCardIds.length) {
      throw new Error("Your active deck has no cards.");
    }

    const { data: playerCards, error: cardError } = await supabase
      .from("player_cards")
      .select("*, cards(*)")
      .in("id", playerCardIds);

    if (cardError) throw new Error(cardError.message);
    if (!playerCards?.length) throw new Error("Could not load deck cards.");

    const deckPower = playerCards.reduce((sum, playerCard) => {
      const card = playerCard.cards || {};
      const level = Number(playerCard.level || 1);

      const atk = Number(
        card.attack ??
          card.atk ??
          card.base_attack ??
          card.base_atk ??
          0
      );

      const def = Number(
        card.defense ??
          card.def ??
          card.base_defense ??
          card.base_def ??
          0
      );

      const levelMultiplier = 1 + Math.max(level - 1, 0) * 0.07;

      return sum + Math.floor((atk * 2 + def) * levelMultiplier);
    }, 0);

    return Math.max(deckPower, 1);
  }

  async function attackRaidBoss() {
    try {
      setAttacking(true);
      setMessage("");
      setLastHit(null);

      const deckPower = await getActiveDeckPower();

      const roll = 0.85 + Math.random() * 0.3;
      const crit = Math.random() < 0.12 ? 1.5 : 1;
      const damage = Math.max(1, Math.floor(deckPower * roll * crit));

      const { data, error } = await supabase.rpc("record_raid_attack", {
        p_event_id: event.id,
        p_damage: damage,
      });

      if (error) throw new Error(error.message);

      setLastHit(data);
      setMessage(`Attack landed for ${Number(data.damage).toLocaleString()} damage.`);
      await loadRaid();
    } catch (err) {
      setMessage(err.message || "Raid attack failed.");
    } finally {
      setAttacking(false);
    }
  }

  async function claimReward() {
    try {
      setMessage("");

      const { data, error } = await supabase.rpc("claim_raid_rank_reward", {
        p_event_id: event.id,
      });

      if (error) throw new Error(error.message);

      setMessage(
        `Reward claimed. Final Rank: #${data.rank}. Gold +${data.gold_added}, Gems +${data.gems_added}.`
      );

      await loadRaid();
    } catch (err) {
      setMessage(err.message || "Could not claim reward.");
    }
  }

  const myRank = useMemo(() => {
    if (!user || !rankings.length) return null;

    const index = rankings.findIndex((row) => row.user_id === user.id);
    return index >= 0 ? index + 1 : null;
  }, [rankings, user]);

  const bossHp = Number(event?.boss_max_hp || 1);
  const currentBossDamage = globalDamage % bossHp;
  const bossHpRemaining = Math.max(bossHp - currentBossDamage, 0);
  const bossProgressPercent = Math.min(
    100,
    Math.floor((currentBossDamage / bossHp) * 100)
  );
  const bossesDefeated = Math.floor(globalDamage / bossHp);

  const raidEnded = event ? new Date(event.ends_at) <= new Date() : false;

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
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border border-purple-500/30 bg-slate-900 p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-purple-300 text-sm uppercase tracking-widest">
                Weekend Raid Test
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
          <div className="lg:col-span-2 rounded-2xl border border-red-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-6">
            <p className="text-red-300 text-sm uppercase tracking-widest">
              Raid Boss
            </p>

            <h2 className="text-3xl font-bold mt-1">
              {event.boss_name || "Raid Boss"}
            </h2>

            <p className="text-slate-400 mt-1">Boss Level {event.boss_level || 1}</p>

            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Current Boss HP</span>
                <span>
                  {bossHpRemaining.toLocaleString()} / {bossHp.toLocaleString()}
                </span>
              </div>

              <div className="h-5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${bossProgressPercent}%` }}
                />
              </div>

              <p className="text-slate-400 text-sm mt-2">
                Global Damage: {globalDamage.toLocaleString()} · Bosses Defeated:{" "}
                {bossesDefeated.toLocaleString()}
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Your Damage"
                value={Number(progress?.total_damage_dealt || 0).toLocaleString()}
              />
              <StatCard
                label="Your Rank"
                value={myRank ? `#${myRank}` : "Unranked"}
              />
              <StatCard
                label="Boss Kills"
                value={Number(progress?.total_bosses_killed || 0).toLocaleString()}
              />
              <StatCard
                label="Stamina"
                value={`${profile?.stamina ?? "?"}/${profile?.max_stamina ?? "?"}`}
              />
            </div>

            <button
              onClick={attackRaidBoss}
              disabled={attacking || raidEnded}
              className="mt-8 w-full rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed px-6 py-4 font-bold text-lg"
            >
              {attacking
                ? "Attacking..."
                : `Attack Boss - ${event.stamina_cost || 5} Stamina`}
            </button>

            {lastHit && (
              <div className="mt-4 rounded-xl bg-purple-950/40 border border-purple-500/30 p-4">
                <p className="text-purple-200 font-semibold">
                  Last Hit: {Number(lastHit.damage).toLocaleString()} damage
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-yellow-500/30 bg-slate-900 p-6">
            <h3 className="text-2xl font-bold mb-4">Rank Rewards</h3>

            <div className="space-y-3">
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
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <h3 className="text-2xl font-bold mb-4">Raid Rankings</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="py-3">Rank</th>
                  <th className="py-3">Player</th>
                  <th className="py-3">Damage</th>
                  <th className="py-3">Boss Kills</th>
                  <th className="py-3">Score</th>
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
                      {Number(row.total_damage_dealt || 0).toLocaleString()}
                    </td>
                    <td className="py-3">
                      {Number(row.total_bosses_killed || 0).toLocaleString()}
                    </td>
                    <td className="py-3">
                      {Number(row.event_rank_score || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {!rankings.length && (
                  <tr>
                    <td className="py-6 text-slate-400" colSpan="5">
                      No raid attacks yet. Be the first to hit the boss.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
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
