import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Award,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  FilterX,
  Flame,
  Image as ImageIcon,
  Layers,
  MapPin,
  Search,
  Sparkles,
  Star,
  Swords,
  TrendingUp,
  Trophy,
  Users,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  GalleryPhoto,
  HofSubTab,
  QuizPosition,
  QuizRecord,
} from '../types';
import {
  POSITION_OPTIONS,
  POSITION_POINTS,
  StandingsSortMode,
  compareDFirst,
  computeStandings,
} from '../data/initialData';
import {
  FirstGoldCrown,
  PositionCrownOrEmblem,
  SecondSilverCrown,
  ThirdBronzeCrown,
} from './Crowns';

interface HallOfFameProps {
  bsYears: string[];
  quizzes: QuizRecord[];
  gallery: GalleryPhoto[];
}

interface LightboxState {
  photos: { url: string; title: string; subtitle: string }[];
  index: number;
}

function getPlayerQuizRating(quiz: QuizRecord, playerName: string): number {
  if (quiz.playerRatings) {
    const exact = quiz.playerRatings[playerName];
    if (typeof exact === 'number' && !Number.isNaN(exact)) {
      return Math.min(10, Math.max(1, Math.round(exact * 10) / 10));
    }
    const target = playerName.trim().toLowerCase();
    for (const [k, v] of Object.entries(quiz.playerRatings)) {
      if (k.trim().toLowerCase() === target && typeof v === 'number' && !Number.isNaN(v)) {
        return Math.min(10, Math.max(1, Math.round(v * 10) / 10));
      }
    }
  }
  return Math.min(10, Math.max(1, Math.round((quiz.rating || 8) * 10) / 10));
}

export function HallOfFame({ bsYears, quizzes, gallery }: HallOfFameProps) {
  const [subTab, setSubTab] = useState<
    HofSubTab | 'head-to-head' | 'era-streaks' | 'season-wrapped'
  >('standings');
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  // Standings filters
  const [standingsYear, setStandingsYear] = useState<string>('all');
  const [standingsSort, setStandingsSort] =
    useState<StandingsSortMode>('points');

  // External Wins filters
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterPosition, setFilterPosition] = useState<string>('');
  const [filterHost, setFilterHost] = useState<string>('');
  const [filterPlayer, setFilterPlayer] = useState<string>('');
  const [selectedQuiz, setSelectedQuiz] = useState<QuizRecord | null>(null);

  // Squad Synergy filters
  const [synergyYear, setSynergyYear] = useState<string>('all');
  const [synergySearch, setSynergySearch] = useState<string>('');
  const [synergySort, setSynergySort] = useState<
    'podiums' | 'first' | 'second' | 'third' | 'points' | 'qual-rate'
  >('podiums');

  // Head-to-Head Compare filters (excludes standings points)
  const [h2hYear, setH2hYear] = useState<string>('all');
  const [h2hPlayerA, setH2hPlayerA] = useState<string>('');
  const [h2hPlayerB, setH2hPlayerB] = useState<string>('');

  // Player Career Profile modal
  const [selectedCareerPlayer, setSelectedCareerPlayer] = useState<string | null>(
    null
  );

  // DQR Season Wrapped state
  const [wrappedYear, setWrappedYear] = useState<string>(
    () => bsYears[bsYears.length - 1] || 'all'
  );
  const [wrappedSlide, setWrappedSlide] = useState<number>(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightbox) setLightbox(null);
        else if (selectedQuiz) setSelectedQuiz(null);
        else if (selectedCareerPlayer) setSelectedCareerPlayer(null);
      }
      if (lightbox && e.key === 'ArrowRight') {
        setLightbox((prev) =>
          prev
            ? { ...prev, index: (prev.index + 1) % prev.photos.length }
            : null
        );
      }
      if (lightbox && e.key === 'ArrowLeft') {
        setLightbox((prev) =>
          prev
            ? {
                ...prev,
                index:
                  (prev.index - 1 + prev.photos.length) % prev.photos.length,
              }
            : null
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightbox, selectedQuiz, selectedCareerPlayer]);

  const computeAwardsForFilter = (yearFilter: string) => {
    const normalizedFilter = yearFilter.trim();
    const scopedQuizzes =
      normalizedFilter === 'all'
        ? quizzes
        : quizzes.filter((q) => (q.yearBS || '').trim() === normalizedFilter);

    const base = computeStandings(scopedQuizzes, 'all', 'points');
    if (base.length === 0) return null;

    // 1. Gold Sovereign (must have >= 1 first place)
    const goldCandidates = base.filter((r) => r.first > 0);
    const goldSorted = [...goldCandidates].sort(
      (a, b) => b.first - a.first || b.points - a.points
    );
    const topGold = goldSorted[0] || null;
    const goldWinners = topGold
      ? goldSorted.filter(
          (r) => r.first === topGold.first && r.points === topGold.points
        )
      : [];

    // 2. Clutch Qualifier (most qualifications, must have >= 1 qualified)
    const qualPool = base.filter((r) => r.qualified > 0);
    const qualSorted = [...qualPool].sort(
      (a, b) => b.qualified - a.qualified || b.points - a.points
    );
    const topQual = qualSorted[0] || null;
    const qualWinners = topQual
      ? qualSorted.filter(
          (r) => r.qualified === topQual.qualified && r.points === topQual.points
        )
      : [];

    // 3. Podium Regularity (must have >= 1 top-3 podium)
    const podCandidates = base.filter(
      (r) => r.first + r.second + r.third > 0
    );
    const podSorted = [...podCandidates].sort((a, b) => {
      const podA = a.first + a.second + a.third;
      const podB = b.first + b.second + b.third;
      if (podB !== podA) return podB - podA;
      return b.points - a.points;
    });
    const topPod = podSorted[0] || null;
    const topPodCount = topPod
      ? topPod.first + topPod.second + topPod.third
      : 0;
    const podiumWinners = topPod
      ? podSorted.filter(
          (r) =>
            r.first + r.second + r.third === topPodCount &&
            r.points === topPod.points
        )
      : [];

    return {
      mostFirst: topGold,
      goldWinners,
      bestQual: topQual,
      qualWinners,
      mostPodiums: topPod,
      podiumWinners,
    };
  };

  const seasonAwards = useMemo(
    () => computeAwardsForFilter(standingsYear),
    [quizzes, standingsYear]
  );

  const awardBonusMap = useMemo(() => {
    const map = new Map<string, number>();
    const grant = (player: string) =>
      map.set(player, (map.get(player) || 0) + 3);

    const grantAwards = (
      awards: ReturnType<typeof computeAwardsForFilter>
    ) => {
      if (!awards) return;
      awards.goldWinners.forEach((w) => grant(w.player));
      awards.qualWinners.forEach((w) => grant(w.player));
      awards.podiumWinners.forEach((w) => grant(w.player));
    };

    if (standingsYear === 'all') {
      grantAwards(seasonAwards);
      const allYears = Array.from(
        new Set(
          [...bsYears, ...quizzes.map((q) => q.yearBS)]
            .map((y) => (y || '').trim())
            .filter(Boolean)
        )
      ).sort();
      for (const yr of allYears) {
        grantAwards(computeAwardsForFilter(yr));
      }
    } else {
      grantAwards(seasonAwards);
    }

    return map;
  }, [quizzes, bsYears, standingsYear, seasonAwards]);

  const standings = useMemo(() => {
    const normalizedFilter = standingsYear.trim();
    const scopedQuizzes =
      normalizedFilter === 'all'
        ? quizzes
        : quizzes.filter((q) => (q.yearBS || '').trim() === normalizedFilter);

    const base = computeStandings(scopedQuizzes, 'all', standingsSort);
    if (awardBonusMap.size === 0) return base;

    const withBonus = base.map((row) => ({
      ...row,
      points: row.points + (awardBonusMap.get(row.player) || 0),
    }));

    if (standingsSort === 'points') {
      withBonus.sort(
        (a, b) =>
          b.points - a.points ||
          a.earliestDate - b.earliestDate ||
          compareDFirst(a.player, b.player)
      );
    }

    return withBonus;
  }, [quizzes, standingsYear, standingsSort, awardBonusMap]);

  const synergyRows = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        playerA: string;
        playerB: string;
        first: number;
        second: number;
        third: number;
        podiums: number;
        totalQuizzes: number;
        qualified: number;
        points: number;
      }
    >();

    for (const q of quizzes) {
      if (synergyYear !== 'all' && q.yearBS !== synergyYear) continue;
      const uniqueClean = Array.from(
        new Set(q.players.map((p) => p.trim()).filter(Boolean))
      );
      if (uniqueClean.length < 2) continue;

      const pts = POSITION_POINTS[q.position] ?? 0;
      const isQual = q.position !== 'Not Qualified';

      for (let i = 0; i < uniqueClean.length; i++) {
        for (let j = i + 1; j < uniqueClean.length; j++) {
          const [playerA, playerB] = [uniqueClean[i], uniqueClean[j]].sort(
            (a, b) => a.localeCompare(b)
          );
          const key = `${playerA.toLowerCase()}__${playerB.toLowerCase()}`;
          if (!map.has(key)) {
            map.set(key, {
              key,
              playerA,
              playerB,
              first: 0,
              second: 0,
              third: 0,
              podiums: 0,
              totalQuizzes: 0,
              qualified: 0,
              points: 0,
            });
          }
          const row = map.get(key)!;
          row.totalQuizzes += 1;
          row.points += pts;
          if (isQual) row.qualified += 1;
          if (q.position === '1st') row.first += 1;
          else if (q.position === '2nd') row.second += 1;
          else if (q.position === '3rd') row.third += 1;
          row.podiums = row.first + row.second + row.third;
        }
      }
    }

    const qSearch = synergySearch.trim().toLowerCase();
    const list = Array.from(map.values())
      .map((r) => ({
        ...r,
        qualRate:
          r.totalQuizzes > 0
            ? Math.round((r.qualified / r.totalQuizzes) * 100)
            : 0,
      }))
      .filter((r) => {
        if (!qSearch) return true;
        return (
          r.playerA.toLowerCase().includes(qSearch) ||
          r.playerB.toLowerCase().includes(qSearch)
        );
      });

    list.sort((a, b) => {
      switch (synergySort) {
        case 'first':
          return b.first - a.first || b.podiums - a.podiums || b.points - a.points;
        case 'second':
          return b.second - a.second || b.podiums - a.podiums || b.points - a.points;
        case 'third':
          return b.third - a.third || b.podiums - a.podiums || b.points - a.points;
        case 'points':
          return b.points - a.points || b.podiums - a.podiums;
        case 'qual-rate':
          return b.qualRate - a.qualRate || b.qualified - a.qualified || b.points - a.points;
        case 'podiums':
        default:
          return (
            b.podiums - a.podiums ||
            b.first - a.first ||
            b.second - a.second ||
            b.third - a.third ||
            b.points - a.points
          );
      }
    });

    return list;
  }, [quizzes, synergyYear, synergySearch, synergySort]);

  const podiumTop3 = standings.slice(0, 3);

  const uniqueHosts = useMemo(
    () => Array.from(new Set(quizzes.map((q) => q.host).filter(Boolean))).sort(),
    [quizzes]
  );

  const uniquePlayers = useMemo(() => {
    const set = new Set<string>();
    quizzes.forEach((q) => q.players.forEach((p) => set.add(p.trim())));
    return Array.from(set).filter(Boolean).sort();
  }, [quizzes]);

  useEffect(() => {
    if (uniquePlayers.length >= 2) {
      if (!h2hPlayerA || !uniquePlayers.includes(h2hPlayerA)) {
        setH2hPlayerA(uniquePlayers[0]);
      }
      if (
        !h2hPlayerB ||
        !uniquePlayers.includes(h2hPlayerB) ||
        h2hPlayerB === h2hPlayerA
      ) {
        const second =
          uniquePlayers.find((p) => p !== (h2hPlayerA || uniquePlayers[0])) ||
          uniquePlayers[1];
        setH2hPlayerB(second);
      }
    } else if (uniquePlayers.length === 1) {
      setH2hPlayerA(uniquePlayers[0]);
      setH2hPlayerB(uniquePlayers[0]);
    }
  }, [uniquePlayers, h2hPlayerA, h2hPlayerB]);

  const h2hData = useMemo(() => {
    if (!h2hPlayerA || !h2hPlayerB) return null;
    const normalizedFilter = h2hYear.trim();
    const scoped =
      normalizedFilter === 'all'
        ? quizzes
        : quizzes.filter((q) => (q.yearBS || '').trim() === normalizedFilter);

    const summarize = (playerName: string) => {
      const target = playerName.trim().toLowerCase();
      let first = 0;
      let second = 0;
      let third = 0;
      let top46 = 0;
      let qualified = 0;
      let notQualified = 0;
      let totalQuizzes = 0;
      let ratingSum = 0;
      const list: QuizRecord[] = [];

      for (const q of scoped) {
        const played = q.players.some((p) => p.trim().toLowerCase() === target);
        if (!played) continue;
        totalQuizzes += 1;
        ratingSum += getPlayerQuizRating(q, playerName);
        list.push(q);
        if (q.position === 'Not Qualified') {
          notQualified += 1;
        } else {
          qualified += 1;
          if (q.position === '1st') first += 1;
          else if (q.position === '2nd') second += 1;
          else if (q.position === '3rd') third += 1;
          else top46 += 1;
        }
      }

      const podiums = first + second + third;
      const qualRate =
        totalQuizzes > 0 ? Math.round((qualified / totalQuizzes) * 100) : 0;
      const podiumRate =
        totalQuizzes > 0 ? Math.round((podiums / totalQuizzes) * 100) : 0;
      const avgRating =
        totalQuizzes > 0 ? Math.round((ratingSum / totalQuizzes) * 10) / 10 : 0;

      return {
        name: playerName,
        first,
        second,
        third,
        top46,
        podiums,
        qualified,
        notQualified,
        totalQuizzes,
        qualRate,
        podiumRate,
        avgRating,
        quizzes: list,
      };
    };

    const a = summarize(h2hPlayerA);
    const b = summarize(h2hPlayerB);

    const targetA = h2hPlayerA.trim().toLowerCase();
    const targetB = h2hPlayerB.trim().toLowerCase();
    const sharedQuizzes =
      targetA === targetB
        ? []
        : scoped.filter((q) => {
            const lower = q.players.map((p) => p.trim().toLowerCase());
            return lower.includes(targetA) && lower.includes(targetB);
          });

    const sharedWins = sharedQuizzes.filter((q) => q.position === '1st').length;
    const sharedPodiums = sharedQuizzes.filter(
      (q) => q.position === '1st' || q.position === '2nd' || q.position === '3rd'
    ).length;
    const sharedQualRate =
      sharedQuizzes.length > 0
        ? Math.round(
            (sharedQuizzes.filter((q) => q.position !== 'Not Qualified').length /
              sharedQuizzes.length) *
              100
          )
        : 0;

    return { a, b, sharedQuizzes, sharedWins, sharedPodiums, sharedQualRate };
  }, [quizzes, h2hYear, h2hPlayerA, h2hPlayerB]);

  const careerProfile = useMemo(() => {
    if (!selectedCareerPlayer) return null;
    const target = selectedCareerPlayer.trim().toLowerCase();
    const playedQuizzes = quizzes
      .filter((q) => q.players.some((p) => p.trim().toLowerCase() === target))
      .sort(
        (a, b) =>
          (b.yearBS || '').localeCompare(a.yearBS || '') ||
          (b.createdAt || 0) - (a.createdAt || 0)
      );

    let first = 0;
    let second = 0;
    let third = 0;
    let fourth = 0;
    let fifth = 0;
    let sixth = 0;
    let notQualified = 0;
    let qualified = 0;
    let ratingSum = 0;

    const yearSet = new Set<string>();
    const partnerMap = new Map<
      string,
      { name: string; shared: number; podiums: number; wins: number; qualified: number }
    >();
    const hostMap = new Map<
      string,
      { host: string; total: number; podiums: number; wins: number }
    >();

    for (const q of playedQuizzes) {
      ratingSum += getPlayerQuizRating(q, selectedCareerPlayer);
      if (q.yearBS?.trim()) yearSet.add(q.yearBS.trim());
      const isQual = q.position !== 'Not Qualified';
      const isPodium =
        q.position === '1st' || q.position === '2nd' || q.position === '3rd';
      const isWin = q.position === '1st';

      if (isQual) qualified += 1;
      switch (q.position) {
        case '1st':
          first += 1;
          break;
        case '2nd':
          second += 1;
          break;
        case '3rd':
          third += 1;
          break;
        case '4th':
          fourth += 1;
          break;
        case '5th':
          fifth += 1;
          break;
        case '6th':
          sixth += 1;
          break;
        default:
          notQualified += 1;
          break;
      }

      if (q.host?.trim()) {
        const hostKey = q.host.trim();
        const existingHost = hostMap.get(hostKey) || {
          host: hostKey,
          total: 0,
          podiums: 0,
          wins: 0,
        };
        existingHost.total += 1;
        if (isPodium) existingHost.podiums += 1;
        if (isWin) existingHost.wins += 1;
        hostMap.set(hostKey, existingHost);
      }

      const uniqueTeammates = Array.from(
        new Set(q.players.map((p) => p.trim()).filter(Boolean))
      );
      for (const mate of uniqueTeammates) {
        if (mate.toLowerCase() === target) continue;
        const mateKey = mate.toLowerCase();
        const existingMate = partnerMap.get(mateKey) || {
          name: mate,
          shared: 0,
          podiums: 0,
          wins: 0,
          qualified: 0,
        };
        existingMate.shared += 1;
        if (isQual) existingMate.qualified += 1;
        if (isPodium) existingMate.podiums += 1;
        if (isWin) existingMate.wins += 1;
        partnerMap.set(mateKey, existingMate);
      }
    }

    const totalQuizzes = playedQuizzes.length;
    const podiums = first + second + third;
    const qualRate =
      totalQuizzes > 0 ? Math.round((qualified / totalQuizzes) * 100) : 0;
    const podiumRate =
      totalQuizzes > 0 ? Math.round((podiums / totalQuizzes) * 100) : 0;
    const avgRating =
      totalQuizzes > 0 ? Math.round((ratingSum / totalQuizzes) * 10) / 10 : 0;
    const activeYears = Array.from(yearSet).sort();

    const bestPartner =
      Array.from(partnerMap.values()).sort(
        (a, b) =>
          b.podiums - a.podiums ||
          b.wins - a.wins ||
          b.qualified - a.qualified ||
          b.shared - a.shared
      )[0] || null;

    const topHost =
      Array.from(hostMap.values()).sort(
        (a, b) =>
          b.wins - a.wins || b.podiums - a.podiums || b.total - a.total
      )[0] || null;

    return {
      name: selectedCareerPlayer,
      totalQuizzes,
      qualified,
      notQualified,
      first,
      second,
      third,
      fourth,
      fifth,
      sixth,
      podiums,
      qualRate,
      podiumRate,
      avgRating,
      activeYears,
      bestPartner,
      topHost,
      quizzes: playedQuizzes,
    };
  }, [quizzes, selectedCareerPlayer]);

  const eraProgressionData = useMemo(() => {
    const chrono = [...quizzes].sort(
      (a, b) =>
        (a.yearBS || '').trim().localeCompare((b.yearBS || '').trim()) ||
        (a.createdAt || 0) - (b.createdAt || 0)
    );

    let bestQualStreak = 0;
    let runningQual = 0;
    let bestPodiumStreak = 0;
    let runningPodium = 0;
    let bestGoldStreak = 0;
    let runningGold = 0;

    for (const q of chrono) {
      const isQual = q.position !== 'Not Qualified';
      const isPodium =
        q.position === '1st' || q.position === '2nd' || q.position === '3rd';
      const isGold = q.position === '1st';

      if (isQual) {
        runningQual += 1;
        if (runningQual > bestQualStreak) bestQualStreak = runningQual;
      } else {
        runningQual = 0;
      }

      if (isPodium) {
        runningPodium += 1;
        if (runningPodium > bestPodiumStreak) bestPodiumStreak = runningPodium;
      } else {
        runningPodium = 0;
      }

      if (isGold) {
        runningGold += 1;
        if (runningGold > bestGoldStreak) bestGoldStreak = runningGold;
      } else {
        runningGold = 0;
      }
    }

    const currentQualStreak = runningQual;
    const currentPodiumStreak = runningPodium;

    const allYearKeys = Array.from(
      new Set(
        [...bsYears, ...quizzes.map((q) => q.yearBS)]
          .map((y) => (y || '').trim())
          .filter(Boolean)
      )
    ).sort();

    const eras = allYearKeys.map((yr) => {
      const yrQuizzes = chrono.filter(
        (q) => (q.yearBS || '').trim() === yr
      );
      const first = yrQuizzes.filter((q) => q.position === '1st').length;
      const second = yrQuizzes.filter((q) => q.position === '2nd').length;
      const third = yrQuizzes.filter((q) => q.position === '3rd').length;
      const podiums = first + second + third;
      const qualified = yrQuizzes.filter(
        (q) => q.position !== 'Not Qualified'
      ).length;
      const total = yrQuizzes.length;
      const qualRate = total > 0 ? Math.round((qualified / total) * 100) : 0;
      const podiumRate = total > 0 ? Math.round((podiums / total) * 100) : 0;

      const yrStandings = computeStandings(yrQuizzes, 'all', 'points');
      const standout = yrStandings[0] || null;

      return {
        year: yr,
        total,
        first,
        second,
        third,
        podiums,
        qualified,
        qualRate,
        podiumRate,
        standoutPlayer: standout ? standout.player : null,
      };
    });

    const bestSeason =
      [...eras]
        .filter((e) => e.total > 0)
        .sort(
          (a, b) =>
            b.first - a.first ||
            b.podiums - a.podiums ||
            b.qualRate - a.qualRate
        )[0] || null;

    const playerStreaks = uniquePlayers
      .map((player) => {
        const target = player.trim().toLowerCase();
        const pQuizzes = chrono.filter((q) =>
          q.players.some((p) => p.trim().toLowerCase() === target)
        );
        let pBestQual = 0;
        let pRunQual = 0;
        let pBestPod = 0;
        let pRunPod = 0;
        let pBestGold = 0;
        let pRunGold = 0;

        for (const q of pQuizzes) {
          const isQual = q.position !== 'Not Qualified';
          const isPod =
            q.position === '1st' ||
            q.position === '2nd' ||
            q.position === '3rd';
          const isGold = q.position === '1st';

          if (isQual) {
            pRunQual += 1;
            if (pRunQual > pBestQual) pBestQual = pRunQual;
          } else {
            pRunQual = 0;
          }

          if (isPod) {
            pRunPod += 1;
            if (pRunPod > pBestPod) pBestPod = pRunPod;
          } else {
            pRunPod = 0;
          }

          if (isGold) {
            pRunGold += 1;
            if (pRunGold > pBestGold) pBestGold = pRunGold;
          } else {
            pRunGold = 0;
          }
        }

        return {
          player,
          totalQuizzes: pQuizzes.length,
          currentQualStreak: pRunQual,
          bestQualStreak: pBestQual,
          currentPodiumStreak: pRunPod,
          bestPodiumStreak: pBestPod,
          bestGoldStreak: pBestGold,
        };
      })
      .sort(
        (a, b) =>
          b.bestQualStreak - a.bestQualStreak ||
          b.bestPodiumStreak - a.bestPodiumStreak ||
          b.currentQualStreak - a.currentQualStreak ||
          b.totalQuizzes - a.totalQuizzes
      );

    return {
      totalQuizzes: chrono.length,
      bestQualStreak,
      currentQualStreak,
      bestPodiumStreak,
      currentPodiumStreak,
      bestGoldStreak,
      eras,
      bestSeason,
      playerStreaks,
    };
  }, [quizzes, bsYears, uniquePlayers]);

  const wrappedData = useMemo(() => {
    const normalized = wrappedYear.trim();
    const scoped = (
      normalized === 'all'
        ? quizzes
        : quizzes.filter((q) => (q.yearBS || '').trim() === normalized)
    )
      .slice()
      .sort(
        (a, b) =>
          (a.yearBS || '').trim().localeCompare((b.yearBS || '').trim()) ||
          (a.createdAt || 0) - (b.createdAt || 0)
      );

    const totalQuizzes = scoped.length;
    const first = scoped.filter((q) => q.position === '1st').length;
    const second = scoped.filter((q) => q.position === '2nd').length;
    const third = scoped.filter((q) => q.position === '3rd').length;
    const podiums = first + second + third;
    const qualified = scoped.filter((q) => q.position !== 'Not Qualified').length;
    const qualRate = totalQuizzes > 0 ? Math.round((qualified / totalQuizzes) * 100) : 0;
    const podiumRate = totalQuizzes > 0 ? Math.round((podiums / totalQuizzes) * 100) : 0;
    const avgQuizRating =
      totalQuizzes > 0
        ? Math.round(
            (scoped.reduce((sum, q) => sum + (q.rating || 0), 0) / totalQuizzes) * 10
          ) / 10
        : 0;

    const standingsList = computeStandings(scoped, 'all', 'points');
    const pointsLeader = standingsList[0] || null;
    const goldSovereign =
      standingsList
        .filter((r) => r.first > 0)
        .sort((a, b) => b.first - a.first || b.points - a.points)[0] || null;
    const clutchQualifier =
      standingsList
        .filter((r) => r.qualified > 0)
        .sort((a, b) => b.qualified - a.qualified || b.points - a.points)[0] || null;

    // Top Rated Player (using per-player individual quiz ratings)
    const ratingAccum = new Map<
      string,
      { player: string; sum: number; count: number; podiums: number }
    >();
    const rosterSet = new Set<string>();
    const hostMap = new Map<
      string,
      { host: string; total: number; podiums: number; wins: number }
    >();
    const duoMap = new Map<
      string,
      {
        playerA: string;
        playerB: string;
        shared: number;
        wins: number;
        podiums: number;
        qualified: number;
        points: number;
      }
    >();

    let bestQualStreak = 0;
    let runQual = 0;
    let bestPodiumStreak = 0;
    let runPod = 0;

    for (const q of scoped) {
      const isQual = q.position !== 'Not Qualified';
      const isPod =
        q.position === '1st' || q.position === '2nd' || q.position === '3rd';
      const isWin = q.position === '1st';
      const pts = POSITION_POINTS[q.position] ?? 0;

      if (isQual) {
        runQual += 1;
        if (runQual > bestQualStreak) bestQualStreak = runQual;
      } else {
        runQual = 0;
      }
      if (isPod) {
        runPod += 1;
        if (runPod > bestPodiumStreak) bestPodiumStreak = runPod;
      } else {
        runPod = 0;
      }

      if (q.host?.trim()) {
        const hk = q.host.trim();
        const curH = hostMap.get(hk) || { host: hk, total: 0, podiums: 0, wins: 0 };
        curH.total += 1;
        if (isPod) curH.podiums += 1;
        if (isWin) curH.wins += 1;
        hostMap.set(hk, curH);
      }

      const uniqueClean = Array.from(
        new Set(q.players.map((p) => p.trim()).filter(Boolean))
      );
      for (const pl of uniqueClean) {
        rosterSet.add(pl);
        const key = pl.toLowerCase();
        const cur = ratingAccum.get(key) || {
          player: pl,
          sum: 0,
          count: 0,
          podiums: 0,
        };
        cur.sum += getPlayerQuizRating(q, pl);
        cur.count += 1;
        if (isPod) cur.podiums += 1;
        ratingAccum.set(key, cur);
      }

      for (let i = 0; i < uniqueClean.length; i++) {
        for (let j = i + 1; j < uniqueClean.length; j++) {
          const [playerA, playerB] = [uniqueClean[i], uniqueClean[j]].sort((a, b) =>
            a.localeCompare(b)
          );
          const dKey = `${playerA.toLowerCase()}__${playerB.toLowerCase()}`;
          const curD = duoMap.get(dKey) || {
            playerA,
            playerB,
            shared: 0,
            wins: 0,
            podiums: 0,
            qualified: 0,
            points: 0,
          };
          curD.shared += 1;
          if (isWin) curD.wins += 1;
          if (isPod) curD.podiums += 1;
          if (isQual) curD.qualified += 1;
          curD.points += pts;
          duoMap.set(dKey, curD);
        }
      }
    }

    const topRatedPlayers = Array.from(ratingAccum.values())
      .map((item) => ({
        player: item.player,
        avgRating: Math.round((item.sum / item.count) * 10) / 10,
        quizzes: item.count,
        podiums: item.podiums,
      }))
      .sort(
        (a, b) =>
          b.avgRating - a.avgRating ||
          b.quizzes - a.quizzes ||
          b.podiums - a.podiums
      );

    const topDuos = Array.from(duoMap.values())
      .map((d) => ({
        ...d,
        qualRate: d.shared > 0 ? Math.round((d.qualified / d.shared) * 100) : 0,
      }))
      .sort(
        (a, b) =>
          b.podiums - a.podiums ||
          b.wins - a.wins ||
          b.points - a.points ||
          b.shared - a.shared
      );

    const topHost =
      Array.from(hostMap.values()).sort(
        (a, b) => b.wins - a.wins || b.podiums - a.podiums || b.total - a.total
      )[0] || null;

    const signatureQuiz =
      scoped
        .slice()
        .sort(
          (a, b) =>
            (POSITION_POINTS[b.position] ?? 0) - (POSITION_POINTS[a.position] ?? 0) ||
            (b.rating || 0) - (a.rating || 0) ||
            (b.teamCount || 0) - (a.teamCount || 0)
        )[0] || null;

    return {
      label: normalized === 'all' ? 'All-Time Chronicle' : `${normalized} B.S.`,
      totalQuizzes,
      first,
      second,
      third,
      podiums,
      qualified,
      qualRate,
      podiumRate,
      avgQuizRating,
      roster: Array.from(rosterSet).sort(),
      pointsLeader,
      goldSovereign,
      clutchQualifier,
      topRatedPlayer: topRatedPlayers[0] || null,
      topRatedPlayers: topRatedPlayers.slice(0, 4),
      topDuo: topDuos[0] || null,
      runnerUpDuo: topDuos[1] || null,
      bestQualStreak,
      bestPodiumStreak,
      topHost,
      signatureQuiz,
    };
  }, [quizzes, wrappedYear]);

  const downloadWrappedPoster = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1500;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1500);
    bgGrad.addColorStop(0, '#071326');
    bgGrad.addColorStop(0.55, '#09090d');
    bgGrad.addColorStop(1, '#120e07');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 1500);

    // Subtle radial glow
    const glow = ctx.createRadialGradient(600, 260, 40, 600, 260, 560);
    glow.addColorStop(0, 'rgba(212, 175, 55, 0.18)');
    glow.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1200, 1500);

    // Borders
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 36, 1128, 1428);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(52, 52, 1096, 1396);

    // Header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d4af37';
    ctx.font = '700 22px monospace';
    ctx.fillText('DISTRICT QUIZ ROYALE · OFFICIAL RECAP', 600, 125);

    ctx.fillStyle = '#f8e6a0';
    ctx.font = '700 66px Georgia, serif';
    ctx.fillText('DQR Season Wrapped', 600, 200);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 34px monospace';
    ctx.fillText(wrappedData.label.toUpperCase(), 600, 256);

    // Helper for rounded box
    const drawCard = (
      x: number,
      y: number,
      w: number,
      h: number,
      border = 'rgba(212,175,55,0.4)',
      fill = 'rgba(255,255,255,0.04)'
    ) => {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 20);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = border;
      ctx.stroke();
      ctx.restore();
    };

    // Row 1: 4 Overview Stat Tiles
    const tiles = [
      { label: 'QUIZZES', val: String(wrappedData.totalQuizzes), color: '#ffffff' },
      { label: 'QUAL RATE', val: `${wrappedData.qualRate}%`, color: '#6ee7b7' },
      { label: 'PODIUMS', val: String(wrappedData.podiums), color: '#f8e6a0' },
      { label: 'GOLD WINS', val: String(wrappedData.first), color: '#fde047' },
    ];
    tiles.forEach((t, i) => {
      const tx = 88 + i * 262;
      drawCard(tx, 315, 240, 145);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#9ca3af';
      ctx.font = '700 18px monospace';
      ctx.fillText(t.label, tx + 120, 362);
      ctx.fillStyle = t.color;
      ctx.font = '700 54px monospace';
      ctx.fillText(t.val, tx + 120, 428);
    });

    // Row 2: Sovereigns & Highest Rated
    drawCard(88, 495, 498, 220, 'rgba(212,175,55,0.55)', 'rgba(212,175,55,0.08)');
    ctx.textAlign = 'left';
    ctx.fillStyle = '#d4af37';
    ctx.font = '700 18px monospace';
    ctx.fillText('SEASON STANDINGS LEADER', 120, 545);
    ctx.fillStyle = '#f8e6a0';
    ctx.font = '700 36px Georgia, serif';
    ctx.fillText(wrappedData.pointsLeader?.player || '—', 120, 602, 434);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '600 22px monospace';
    ctx.fillText(
      wrappedData.pointsLeader
        ? `${wrappedData.pointsLeader.points} pts · ${wrappedData.pointsLeader.first} Gold · ${wrappedData.pointsLeader.qualified} Qual`
        : 'No standings recorded',
      120,
      655,
      434
    );

    drawCard(614, 495, 498, 220, 'rgba(56,189,248,0.5)', 'rgba(56,189,248,0.07)');
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '700 18px monospace';
    ctx.fillText('HIGHEST RATED PLAYER', 646, 545);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 36px Georgia, serif';
    ctx.fillText(wrappedData.topRatedPlayer?.player || '—', 646, 602, 434);
    ctx.fillStyle = '#bae6fd';
    ctx.font = '600 22px monospace';
    ctx.fillText(
      wrappedData.topRatedPlayer
        ? `${wrappedData.topRatedPlayer.avgRating}/10 Avg · ${wrappedData.topRatedPlayer.quizzes} Quizzes`
        : 'No ratings recorded',
      646,
      655,
      434
    );

    // Row 3: Unstoppable Duo
    drawCard(88, 750, 1024, 210, 'rgba(52,211,153,0.45)', 'rgba(16,185,129,0.07)');
    ctx.fillStyle = '#6ee7b7';
    ctx.font = '700 19px monospace';
    ctx.fillText('UNSTOPPABLE DUO · SQUAD CHEMISTRY', 122, 800);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 38px Georgia, serif';
    ctx.fillText(
      wrappedData.topDuo
        ? `${wrappedData.topDuo.playerA}  &  ${wrappedData.topDuo.playerB}`
        : 'No Duo Records',
      122,
      860,
      956
    );
    ctx.fillStyle = '#d1fae5';
    ctx.font = '600 22px monospace';
    ctx.fillText(
      wrappedData.topDuo
        ? `${wrappedData.topDuo.podiums} Top-3 Podiums · ${wrappedData.topDuo.wins} Gold Wins · ${wrappedData.topDuo.qualRate}% Qual Rate (${wrappedData.topDuo.shared} Shared)`
        : 'Record multi-player quizzes to unlock duo insights',
      122,
      916,
      956
    );

    // Row 4: Streaks & Signature Moment
    drawCard(88, 995, 498, 235);
    ctx.fillStyle = '#f5dc82';
    ctx.font = '700 18px monospace';
    ctx.fillText('MOMENTUM & STREAKS', 120, 1045);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 28px monospace';
    ctx.fillText(`Best Qual Streak: ${wrappedData.bestQualStreak} Quizzes`, 120, 1105);
    ctx.fillStyle = '#f8e6a0';
    ctx.fillText(`Best Podium Run: ${wrappedData.bestPodiumStreak} Top-3`, 120, 1152);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 20px sans-serif';
    ctx.fillText(
      wrappedData.topHost
        ? `Top Host: ${wrappedData.topHost.host} (${wrappedData.topHost.total})`
        : 'Top Host: —',
      120,
      1198,
      434
    );

    drawCard(614, 995, 498, 235);
    ctx.fillStyle = '#f5dc82';
    ctx.font = '700 18px monospace';
    ctx.fillText('SIGNATURE MOMENT', 646, 1045);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 30px Georgia, serif';
    ctx.fillText(wrappedData.signatureQuiz?.quizName || '—', 646, 1102, 434);
    ctx.fillStyle = '#f8e6a0';
    ctx.font = '600 21px monospace';
    ctx.fillText(
      wrappedData.signatureQuiz
        ? `${wrappedData.signatureQuiz.position} Place · ${wrappedData.signatureQuiz.rating}/10 · ${wrappedData.signatureQuiz.teamCount} Teams`
        : 'No quiz highlight',
      646,
      1152,
      434
    );
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 19px sans-serif';
    ctx.fillText(wrappedData.signatureQuiz?.host || '', 646, 1198, 434);

    // Footer Seal
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d4af37';
    ctx.font = '700 22px monospace';
    ctx.fillText(
      `GOLD ${wrappedData.first}  ·  SILVER ${wrappedData.second}  ·  BRONZE ${wrappedData.third}  ·  AVG QUIZ RATING ${wrappedData.avgQuizRating}/10`,
      600,
      1315
    );
    ctx.fillStyle = 'rgba(245, 242, 235, 0.55)';
    ctx.font = '500 18px Georgia, serif';
    ctx.fillText('District Quiz Royale Permanent Academic Archive', 600, 1378);

    const link = document.createElement('a');
    link.download = `DQR-Season-Wrapped-${wrappedYear === 'all' ? 'All-Time' : wrappedYear}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const hasAnyFilter = Boolean(
    filterYear || filterPosition || filterHost || filterPlayer
  );

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      if (filterYear && q.yearBS !== filterYear) return false;
      if (filterPosition && q.position !== filterPosition) return false;
      if (filterHost && q.host !== filterHost) return false;
      if (
        filterPlayer &&
        !q.players.some((p) => p.toLowerCase() === filterPlayer.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [quizzes, filterYear, filterPosition, filterHost, filterPlayer]);

  const groupedGallery = useMemo(() => {
    const map = new Map<
      string,
      { quizName: string; yearBS: string; host: string; items: GalleryPhoto[] }
    >();
    const seenUrlsByGroup = new Map<string, Set<string>>();

    const ensureGroup = (quizName: string, yearBS: string, host: string) => {
      const key = `${yearBS}__${quizName}`;
      if (!map.has(key)) {
        map.set(key, {
          quizName,
          yearBS,
          host,
          items: [],
        });
        seenUrlsByGroup.set(key, new Set());
      }
      return { key, group: map.get(key)!, seen: seenUrlsByGroup.get(key)! };
    };

    for (const item of gallery) {
      const { group, seen } = ensureGroup(
        item.quizName,
        item.yearBS,
        item.host
      );
      if (!seen.has(item.imageUrl)) {
        seen.add(item.imageUrl);
        group.items.push(item);
      }
    }

    for (const quiz of quizzes) {
      if (!quiz.photos || quiz.photos.length === 0) continue;
      const { group, seen } = ensureGroup(
        quiz.quizName,
        quiz.yearBS,
        quiz.host
      );
      const posLabel =
        quiz.position === 'Not Qualified'
          ? 'Participation'
          : `${quiz.position} Place`;
      const playersLabel =
        quiz.players.length > 0 ? quiz.players.join(', ') : '';
      const caption = [posLabel, playersLabel, quiz.extraNote]
        .filter(Boolean)
        .join(' · ');

      quiz.photos.forEach((url, idx) => {
        if (!url || seen.has(url)) return;
        seen.add(url);
        group.items.push({
          id: `quiz-photo-${quiz.id}-${idx}`,
          quizName: quiz.quizName,
          yearBS: quiz.yearBS,
          host: quiz.host,
          caption,
          imageUrl: url,
        });
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      b.yearBS.localeCompare(a.yearBS)
    );
  }, [gallery, quizzes]);

  const clearAllFilters = () => {
    setFilterYear('');
    setFilterPosition('');
    setFilterHost('');
    setFilterPlayer('');
  };

  const getQuizCardTheme = (position: QuizPosition) => {
    switch (position) {
      case '1st':
        return {
          wrapper:
            'border-[#d4af37]/70 bg-gradient-to-br from-[#1b1608] via-[#0c1c34] to-[#0a1f3a] shadow-[0_14px_40px_rgba(212,175,55,0.22)] hover:border-[#f5dc82] hover:shadow-[0_22px_56px_rgba(212,175,55,0.38)]',
          labelColor: 'text-[#f8e6a0]',
          aura: 'bg-[radial-gradient(circle_at_50%_20%,rgba(245,220,130,0.24),transparent_65%)]',
        };
      case '2nd':
        return {
          wrapper:
            'border-slate-300/50 bg-gradient-to-br from-[#162235] via-[#0d223f] to-[#0a1f3a] shadow-[0_14px_36px_rgba(203,213,225,0.14)] hover:border-slate-200/85 hover:shadow-[0_20px_50px_rgba(226,232,240,0.26)]',
          labelColor: 'text-slate-200',
          aura: 'bg-[radial-gradient(circle_at_50%_20%,rgba(226,232,240,0.18),transparent_65%)]',
        };
      case '3rd':
        return {
          wrapper:
            'border-[#b86b35]/60 bg-gradient-to-br from-[#23150d] via-[#122038] to-[#0a1f3a] shadow-[0_14px_36px_rgba(184,107,53,0.18)] hover:border-[#e69f66] hover:shadow-[0_20px_50px_rgba(184,107,53,0.32)]',
          labelColor: 'text-[#f5c08D]',
          aura: 'bg-[radial-gradient(circle_at_50%_20%,rgba(184,107,53,0.24),transparent_65%)]',
        };
      case 'Not Qualified':
        return {
          wrapper:
            'border-white/15 bg-gradient-to-br from-[#0e223d] to-[#08172b] hover:border-white/40',
          labelColor: 'text-slate-300',
          aura: 'bg-[radial-gradient(circle_at_50%_20%,rgba(148,163,184,0.10),transparent_65%)]',
        };
      default:
        return {
          wrapper:
            'border-[#d4af37]/30 bg-gradient-to-br from-[#10294b] to-[#0a1f3a] hover:border-[#d4af37]/70',
          labelColor: 'text-[#e9cf7c]',
          aura: 'bg-[radial-gradient(circle_at_50%_20%,rgba(212,175,55,0.14),transparent_65%)]',
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1f3a] text-white">
      {/* Hall of Fame Architectural Header Banner */}
      <div className="border-b border-[#d4af37]/25 bg-gradient-to-b from-[#07162b] to-[#0a1f3a] px-5 pt-10 pb-8 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45 }}
            >
              <p className="font-mono text-xs tracking-[0.22em] text-[#d4af37] uppercase">
                District Academic Archive
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
                Hall of Fame
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#f5f5f0]/80 sm:text-base">
                Permanent record of district-level quiz performances, podium
                honors, and competition photography across Bikram Sambat years.
              </p>
            </motion.div>

            {/* Sub-tab Segmented Controls */}
            <div
              role="tablist"
              aria-label="Hall of Fame sections"
              className="inline-flex flex-wrap gap-1 rounded-xl border border-[#7c4d2b]/60 bg-[#071528] p-1.5 shadow-inner"
            >
              {(
                [
                  { id: 'gallery', label: 'Gallery' },
                  { id: 'standings', label: 'Standings' },
                  { id: 'external-wins', label: 'External Wins' },
                  { id: 'synergy', label: 'Squad Synergy' },
                  { id: 'head-to-head', label: 'Head-to-Head' },
                  { id: 'era-streaks', label: 'Era & Streaks' },
                  { id: 'season-wrapped', label: 'Season Wrapped' },
                ] as const
              ).map((tab) => {
                const active = subTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => setSubTab(tab.id)}
                    className={`relative rounded-lg px-4 py-2 text-xs font-semibold transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer sm:text-sm ${
                      active
                        ? 'text-[#081324]'
                        : 'text-[#f5f5f0]/75 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="hof-subtab-pill"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#e9c85b] shadow-[0_4px_16px_rgba(212,175,55,0.35)]"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <AnimatePresence mode="wait">
          {/* ================= 1. GALLERY SUB-TAB ================= */}
          {subTab === 'gallery' && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-12"
            >
              {groupedGallery.length === 0 ? (
                <div className="rounded-2xl border border-[#7c4d2b]/40 bg-[#f5f5f0] p-12 text-center text-[#0a1f3a]">
                  <ImageIcon className="mx-auto h-10 w-10 text-[#7c4d2b]" />
                  <h3 className="mt-3 font-display text-xl font-bold">
                    No Gallery Photographs Yet
                  </h3>
                  <p className="mt-1 text-sm text-[#0a1f3a]/70">
                    Administrators can add past district quiz photos from the
                    Admin Panel.
                  </p>
                </div>
              ) : (
                groupedGallery.map((group, gIdx) => (
                  <motion.section
                    key={`${group.yearBS}-${group.quizName}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: gIdx * 0.08 }}
                    className="rounded-2xl border border-[#7c4d2b]/50 bg-[#f5f5f0] p-6 text-[#0a1f3a] shadow-[0_20px_50px_rgba(0,0,0,0.35)] sm:p-8"
                  >
                    <div className="flex flex-col justify-between gap-2 border-b border-[#7c4d2b]/20 pb-4 sm:flex-row sm:items-end">
                      <div>
                        <p className="font-mono text-xs font-semibold tracking-wider text-[#7c4d2b]">
                          {group.yearBS} B.S. · {group.host}
                        </p>
                        <h2 className="mt-1 font-display text-2xl font-bold text-[#0a1f3a]">
                          {group.quizName}
                        </h2>
                      </div>
                      <span className="text-xs font-medium text-[#7c4d2b]">
                        {group.items.length}{' '}
                        {group.items.length === 1 ? 'Photograph' : 'Photographs'}
                      </span>
                    </div>

                    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((photo, pIdx) => (
                        <motion.button
                          key={photo.id}
                          type="button"
                          whileHover={{ y: -5, scale: 1.01 }}
                          onClick={() =>
                            setLightbox({
                              photos: group.items.map((i) => ({
                                url: i.imageUrl,
                                title: i.quizName,
                                subtitle: `${i.yearBS} B.S. · ${i.caption}`,
                              })),
                              index: pIdx,
                            })
                          }
                          className="group relative overflow-hidden rounded-xl border-4 border-[#6c4123] bg-[#0a1f3a] text-left shadow-md transition-shadow hover:shadow-xl cursor-pointer"
                        >
                          <div className="aspect-[4/3] w-full overflow-hidden bg-[#0a1f3a]">
                            <img
                              src={photo.imageUrl}
                              alt={photo.caption || photo.quizName}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-85 transition-opacity group-hover:opacity-100" />
                          <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-[#f5dc82] opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                            <ZoomIn className="h-4 w-4" />
                          </div>
                          <div className="absolute inset-x-0 bottom-0 p-4">
                            <p className="line-clamp-2 text-xs leading-snug font-medium text-[#f5f5f0]">
                              {photo.caption}
                            </p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.section>
                ))
              )}
            </motion.div>
          )}

          {/* ================= 2. STANDINGS SUB-TAB (CLEAN, UNCONGESTED GOLD & BLACK TROPHY) ================= */}
          {subTab === 'standings' && (
            <motion.div
              key="standings"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl border border-[#d4af37]/40 bg-[#08080a] p-6 text-[#f5f2eb] shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:p-10"
            >
              {/* Header & Filters */}
              <div className="flex flex-col justify-between gap-5 border-b border-[#d4af37]/20 pb-7 lg:flex-row lg:items-end">
                <div>
                  <p className="font-mono text-xs tracking-[0.2em] text-[#d4af37] uppercase">
                    Championship Leaderboard
                  </p>
                  <h2 className="mt-1.5 font-display text-2xl font-bold text-[#f8e6a0] sm:text-3xl">
                    District Standings
                  </h2>
                  <p className="mt-1.5 text-xs text-neutral-400">
                    Ranked by Points, then oldest 1st quiz played, then D-first
                    alphabetical order · 1st (6) · 2nd (5) · 3rd (4) · 4th (3) ·
                    5th (2) · 6th (1) · NQ (0)
                  </p>
                </div>

                {/* Standings Filter Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    aria-label="Filter standings by year"
                    value={standingsYear}
                    onChange={(e) => setStandingsYear(e.target.value)}
                    className="rounded-xl border border-[#d4af37]/40 bg-[#12110d] px-3.5 py-2.5 font-mono text-xs font-semibold text-[#f8e6a0] focus:border-[#f0cb65] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All B.S. Years</option>
                    {bsYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr} B.S.
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Sort standings by category"
                    value={standingsSort}
                    onChange={(e) =>
                      setStandingsSort(e.target.value as StandingsSortMode)
                    }
                    className="rounded-xl border border-[#d4af37]/40 bg-[#12110d] px-3.5 py-2.5 text-xs font-semibold text-[#f8e6a0] focus:border-[#f0cb65] focus:outline-none cursor-pointer"
                  >
                    <option value="points">Sort: Highest Points</option>
                    <option value="most-1st">Filter: Most 1st</option>
                    <option value="most-2nd">Filter: Most 2nd</option>
                    <option value="most-3rd">Filter: Most 3rd</option>
                    <option value="most-4th">Filter: Most 4th</option>
                    <option value="most-5th">Filter: Most 5th</option>
                    <option value="most-6th">Filter: Most 6th</option>
                    <option value="most-quizzes">
                      Filter: Most Quizzes Played
                    </option>
                  </select>
                </div>
              </div>

              {/* SEASON AWARDS & TITLES */}
              {seasonAwards && (
                <div className="mt-7 grid gap-4 md:grid-cols-3">
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.35 }}
                    className="rounded-2xl border border-[#d4af37]/40 bg-gradient-to-br from-[#191409] to-[#0d0c09] p-4 shadow-[0_12px_30px_rgba(212,175,55,0.08)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold tracking-widest text-[#d4af37] uppercase">
                        Gold Sovereign ·{' '}
                        {standingsYear === 'all'
                          ? 'All-Time'
                          : `${standingsYear} B.S.`}
                      </span>
                      <Crown className="h-4 w-4 text-[#f5dc82]" />
                    </div>
                    <p className="mt-2 truncate font-display text-lg font-bold text-[#f8e6a0]">
                      {seasonAwards.goldWinners.length > 0
                        ? seasonAwards.goldWinners
                            .map((w) => w.player)
                            .join(', ')
                        : 'No 1st Place Yet'}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-neutral-300">
                      {seasonAwards.mostFirst
                        ? `${seasonAwards.mostFirst.first} × 1st Place`
                        : 'Requires at least one 1st place win'}
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.35, delay: 0.06 }}
                    className="rounded-2xl border border-emerald-400/35 bg-gradient-to-br from-[#0b1b16] to-[#0b0e0d] p-4 shadow-[0_12px_30px_rgba(16,185,129,0.08)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold tracking-widest text-emerald-300 uppercase">
                        Clutch Qualifier
                      </span>
                      <Award className="h-4 w-4 text-emerald-300" />
                    </div>
                    <p className="mt-2 truncate font-display text-lg font-bold text-white">
                      {seasonAwards.qualWinners.length > 0
                        ? seasonAwards.qualWinners
                            .map((w) => w.player)
                            .join(', ')
                        : 'No Qualifiers Yet'}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-emerald-200/90">
                      {seasonAwards.bestQual &&
                      seasonAwards.bestQual.qualified > 0
                        ? `${seasonAwards.bestQual.qualified} ${
                            seasonAwards.bestQual.qualified === 1
                              ? 'Qualification'
                              : 'Qualifications'
                          } (${seasonAwards.bestQual.qualified}/${seasonAwards.bestQual.totalQuizzes} Quizzes)`
                        : 'Requires at least one qualified quiz'}
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.35, delay: 0.12 }}
                    className="rounded-2xl border border-slate-300/35 bg-gradient-to-br from-[#131822] to-[#0b0d11] p-4 shadow-[0_12px_30px_rgba(203,213,225,0.06)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold tracking-widest text-slate-300 uppercase">
                        Podium Regularity
                      </span>
                      <Sparkles className="h-4 w-4 text-slate-200" />
                    </div>
                    <p className="mt-2 truncate font-display text-lg font-bold text-slate-100">
                      {seasonAwards.podiumWinners.length > 0
                        ? seasonAwards.podiumWinners
                            .map((w) => w.player)
                            .join(', ')
                        : 'No Podiums Yet'}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-slate-300">
                      {seasonAwards.mostPodiums
                        ? `${
                            seasonAwards.mostPodiums.first +
                            seasonAwards.mostPodiums.second +
                            seasonAwards.mostPodiums.third
                          } Top-3 (${seasonAwards.mostPodiums.first}G · ${seasonAwards.mostPodiums.second}S · ${seasonAwards.mostPodiums.third}B)`
                        : 'Requires at least one top-3 finish'}
                    </p>
                  </motion.div>
                </div>
              )}

              {/* MID-SIZED PODIUM FOR 1st, 2nd, 3rd */}
              {podiumTop3.length > 0 && (
                <div className="mt-9 pb-8">
                  <div className="mx-auto grid max-w-3xl grid-cols-3 items-end gap-4 sm:gap-7">
                    {/* 2nd Place (Silver Pillar) */}
                    {podiumTop3[1] ? (
                      <motion.div
                        initial={{ opacity: 0, y: 32 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.55, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ y: -5 }}
                        className="flex flex-col items-center text-center"
                      >
                        <SecondSilverCrown className="h-11 w-11 sm:h-12 sm:w-12" />
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCareerPlayer(podiumTop3[1].player)
                          }
                          className="mt-2 max-w-full truncate font-display text-sm font-bold text-slate-100 hover:text-white hover:underline cursor-pointer sm:text-base"
                        >
                          {podiumTop3[1].player}
                        </button>
                        <p className="font-mono text-xs text-slate-300 tabular-nums">
                          {podiumTop3[1].points} pts
                        </p>
                        <motion.div
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{
                            duration: 0.65,
                            delay: 0.22,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          style={{ transformOrigin: 'bottom' }}
                          className="sheen-hover mt-3 flex h-24 w-full flex-col items-center justify-center rounded-t-2xl border border-b-0 border-slate-300/50 bg-gradient-to-b from-slate-300/25 via-slate-500/15 to-[#0d0d10] px-2 sm:h-28"
                        >
                          <span className="font-display text-xl font-extrabold text-slate-200 sm:text-2xl">
                            2nd
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">
                            {podiumTop3[1].qualified}/{podiumTop3[1].totalQuizzes}{' '}
                            Qual.
                          </span>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <div />
                    )}

                    {/* 1st Place (Tall Golden Pillar) */}
                    {podiumTop3[0] && (
                      <motion.div
                        initial={{ opacity: 0, y: 36 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.55, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ y: -6 }}
                        className="flex flex-col items-center text-center"
                      >
                        <FirstGoldCrown className="h-12 w-12 sm:h-14 sm:w-14" />
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCareerPlayer(podiumTop3[0].player)
                          }
                          className="mt-2 max-w-full truncate font-display text-base font-bold text-[#f8e6a0] hover:text-white hover:underline cursor-pointer sm:text-lg"
                        >
                          {podiumTop3[0].player}
                        </button>
                        <p className="font-mono text-xs font-semibold text-[#d4af37] tabular-nums">
                          {podiumTop3[0].points} pts
                        </p>
                        <motion.div
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{
                            duration: 0.78,
                            delay: 0.12,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          style={{ transformOrigin: 'bottom' }}
                          className="sheen-hover mt-3 flex h-32 w-full flex-col items-center justify-center rounded-t-2xl border border-b-0 border-[#f5dc82]/75 bg-gradient-to-b from-[#f0cb65]/45 via-[#b8861b]/25 to-[#120f08] px-2 shadow-[0_-12px_36px_rgba(212,175,55,0.3)] sm:h-36"
                        >
                          <span className="font-display text-2xl font-extrabold text-[#fff2b8] sm:text-3xl">
                            1st
                          </span>
                          <span className="font-mono text-[11px] text-[#f5dc82]">
                            {podiumTop3[0].qualified}/{podiumTop3[0].totalQuizzes}{' '}
                            Qual.
                          </span>
                        </motion.div>
                      </motion.div>
                    )}

                    {/* 3rd Place (Bronze / Warm Wood Pillar) */}
                    {podiumTop3[2] ? (
                      <motion.div
                        initial={{ opacity: 0, y: 28 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.55, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ y: -5 }}
                        className="flex flex-col items-center text-center"
                      >
                        <ThirdBronzeCrown className="h-10 w-10 sm:h-11 sm:w-11" />
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCareerPlayer(podiumTop3[2].player)
                          }
                          className="mt-2 max-w-full truncate font-display text-sm font-bold text-[#f5c08D] hover:text-white hover:underline cursor-pointer sm:text-base"
                        >
                          {podiumTop3[2].player}
                        </button>
                        <p className="font-mono text-xs text-[#d69560] tabular-nums">
                          {podiumTop3[2].points} pts
                        </p>
                        <motion.div
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{
                            duration: 0.6,
                            delay: 0.32,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          style={{ transformOrigin: 'bottom' }}
                          className="sheen-hover mt-3 flex h-20 w-full flex-col items-center justify-center rounded-t-2xl border border-b-0 border-[#b86b35]/60 bg-gradient-to-b from-[#b86b35]/30 via-[#6c3c1b]/20 to-[#110c09] px-2 sm:h-24"
                        >
                          <span className="font-display text-lg font-extrabold text-[#f5c08D] sm:text-xl">
                            3rd
                          </span>
                          <span className="font-mono text-[11px] text-[#d69560]">
                            {podiumTop3[2].qualified}/{podiumTop3[2].totalQuizzes}{' '}
                            Qual.
                          </span>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <div />
                    )}
                  </div>
                </div>
              )}

              {/* SPACIOUS, UNCONGESTED GOLD & BLACK STANDINGS TABLE */}
              {standings.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-[#d4af37]/20 bg-[#11100d] p-10 text-center">
                  <Trophy className="mx-auto h-9 w-9 text-[#d4af37]/60" />
                  <p className="mt-3 text-sm text-neutral-300">
                    No quiz records found for this filter.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table: Position | Player Name | 1st..6th | Total Quizzes | Qualified | Points */}
                  <div className="mt-4 hidden overflow-hidden rounded-2xl border border-[#d4af37]/35 bg-[#0d0c09] md:block">
                    <table className="w-full table-fixed border-collapse text-left">
                      <thead>
                        <tr className="border-b border-[#d4af37]/30 bg-gradient-to-r from-[#1a1509] via-[#13110b] to-[#1a1509] font-mono text-xs tracking-wider text-[#f5dc82] uppercase">
                          <th className="w-[9%] py-4 pl-5 pr-2">Pos</th>
                          <th className="w-[24%] py-4 px-2">Player Name</th>
                          <th className="w-[6.5%] py-4 text-center">1st</th>
                          <th className="w-[6.5%] py-4 text-center">2nd</th>
                          <th className="w-[6.5%] py-4 text-center">3rd</th>
                          <th className="w-[6.5%] py-4 text-center">4th</th>
                          <th className="w-[6.5%] py-4 text-center">5th</th>
                          <th className="w-[6.5%] py-4 text-center">6th</th>
                          <th className="w-[10%] py-4 text-center">
                            Quizzes
                          </th>
                          <th className="w-[9%] py-4 text-center">
                            Qualified
                          </th>
                          <th className="w-[9%] py-4 pr-5 text-right">
                            Points
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#d4af37]/12 text-sm tabular-nums">
                        {standings.map((row, idx) => (
                          <motion.tr
                            key={row.player}
                            initial={{ opacity: 0, x: -14 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, amount: 0.15 }}
                            whileHover={{ x: 4 }}
                            transition={{
                              duration: 0.32,
                              delay: Math.min(idx * 0.04, 0.25),
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            className={`group transition-colors duration-200 hover:bg-[#d4af37]/12 hover:shadow-[inset_2px_0_0_#d4af37] ${
                              idx === 0
                                ? 'bg-[#d4af37]/8'
                                : idx === 1
                                  ? 'bg-white/[0.03]'
                                  : idx === 2
                                    ? 'bg-[#b86b35]/[0.06]'
                                    : ''
                            }`}
                          >
                            <td className="py-4 pl-5 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#d4af37]">
                                  #{idx + 1}
                                </span>
                                {idx === 0 && (
                                  <FirstGoldCrown className="h-5 w-5" />
                                )}
                                {idx === 1 && (
                                  <SecondSilverCrown className="h-5 w-5" />
                                )}
                                {idx === 2 && (
                                  <ThirdBronzeCrown className="h-5 w-5" />
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedCareerPlayer(row.player)
                                }
                                title="View career profile"
                                className="block max-w-full truncate text-left font-semibold text-[#f8f5ee] transition-colors hover:text-[#f8e6a0] hover:underline cursor-pointer"
                              >
                                {row.player}
                              </button>
                            </td>
                            <td className="py-4 text-center font-mono font-semibold text-[#f8e6a0]">
                              {row.first}
                            </td>
                            <td className="py-4 text-center font-mono text-slate-200">
                              {row.second}
                            </td>
                            <td className="py-4 text-center font-mono text-[#f5c08D]">
                              {row.third}
                            </td>
                            <td className="py-4 text-center font-mono text-neutral-300">
                              {row.fourth}
                            </td>
                            <td className="py-4 text-center font-mono text-neutral-300">
                              {row.fifth}
                            </td>
                            <td className="py-4 text-center font-mono text-neutral-300">
                              {row.sixth}
                            </td>
                            <td className="py-4 text-center font-mono font-medium text-white">
                              {row.totalQuizzes}
                            </td>
                            <td className="py-4 text-center font-mono text-emerald-300">
                              {row.qualified}
                            </td>
                            <td className="py-4 pr-5 text-right font-mono text-base font-bold text-[#f0cb65]">
                              {row.points}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Trophy Cards (Zero sideways scroll!) */}
                  <div className="mt-4 space-y-3.5 md:hidden">
                    {standings.map((row, idx) => (
                      <motion.div
                        key={row.player}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.15 }}
                        whileHover={{ y: -3 }}
                        transition={{
                          duration: 0.32,
                          delay: Math.min(idx * 0.04, 0.25),
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="rounded-2xl border border-[#d4af37]/30 bg-[#100e0a] p-4 transition-colors hover:border-[#d4af37]/60 hover:shadow-[0_12px_28px_rgba(212,175,55,0.12)]"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-[#d4af37]/15 pb-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#d4af37]">
                              #{idx + 1}
                            </span>
                            {idx === 0 && (
                              <FirstGoldCrown className="h-5 w-5 shrink-0" />
                            )}
                            {idx === 1 && (
                              <SecondSilverCrown className="h-5 w-5 shrink-0" />
                            )}
                            {idx === 2 && (
                              <ThirdBronzeCrown className="h-5 w-5 shrink-0" />
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedCareerPlayer(row.player)
                              }
                              className="truncate text-left font-display text-base font-bold text-[#f8e6a0] hover:underline cursor-pointer"
                            >
                              {row.player}
                            </button>
                          </div>
                          <span className="shrink-0 font-mono text-sm font-bold text-[#f0cb65]">
                            {row.points} pts
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-6 gap-1.5 text-center font-mono text-xs tabular-nums">
                          <div className="rounded bg-white/5 py-1.5">
                            <span className="block text-[10px] text-[#f5dc82]">
                              1st
                            </span>
                            <span className="font-bold text-white">
                              {row.first}
                            </span>
                          </div>
                          <div className="rounded bg-white/5 py-1.5">
                            <span className="block text-[10px] text-slate-300">
                              2nd
                            </span>
                            <span className="font-bold text-white">
                              {row.second}
                            </span>
                          </div>
                          <div className="rounded bg-white/5 py-1.5">
                            <span className="block text-[10px] text-[#f5c08D]">
                              3rd
                            </span>
                            <span className="font-bold text-white">
                              {row.third}
                            </span>
                          </div>
                          <div className="rounded bg-white/5 py-1.5">
                            <span className="block text-[10px] text-neutral-400">
                              4th
                            </span>
                            <span className="font-bold text-white">
                              {row.fourth}
                            </span>
                          </div>
                          <div className="rounded bg-white/5 py-1.5">
                            <span className="block text-[10px] text-neutral-400">
                              5th
                            </span>
                            <span className="font-bold text-white">
                              {row.fifth}
                            </span>
                          </div>
                          <div className="rounded bg-white/5 py-1.5">
                            <span className="block text-[10px] text-neutral-400">
                              6th
                            </span>
                            <span className="font-bold text-white">
                              {row.sixth}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between font-mono text-[11px] text-neutral-400">
                          <span>Total Quizzes: {row.totalQuizzes}</span>
                          <span className="text-emerald-300">
                            Qualified: {row.qualified}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ================= 3. EXTERNAL WINS SUB-TAB (YEARWISE + FILTERS) ================= */}
          {subTab === 'external-wins' && (
            <motion.div
              key="external-wins"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex flex-col justify-between gap-5 rounded-2xl border border-[#d4af37]/30 bg-[#07162b] p-5 shadow-lg lg:flex-row lg:items-center">
                <div>
                  <h2 className="font-display text-2xl font-bold text-white">
                    External Wins & Yearwise Archive
                  </h2>
                  <p className="mt-1 text-xs text-[#f5f5f0]/75">
                    Select a Bikram Sambat year below or combine filters in the
                    top corner. Click any quiz box to reveal full details.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
                  <select
                    aria-label="Filter by B.S. Year"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="rounded-lg border border-[#d4af37]/35 bg-[#0a1f3a] px-3 py-2 font-mono text-xs text-white focus:border-[#f0cb65] focus:outline-none cursor-pointer"
                  >
                    <option value="">All Years (B.S.)</option>
                    {bsYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr} B.S.
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Filter by Position"
                    value={filterPosition}
                    onChange={(e) => setFilterPosition(e.target.value)}
                    className="rounded-lg border border-[#d4af37]/35 bg-[#0a1f3a] px-3 py-2 text-xs text-white focus:border-[#f0cb65] focus:outline-none cursor-pointer"
                  >
                    <option value="">All Positions</option>
                    {POSITION_OPTIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Filter by Host"
                    value={filterHost}
                    onChange={(e) => setFilterHost(e.target.value)}
                    className="rounded-lg border border-[#d4af37]/35 bg-[#0a1f3a] px-3 py-2 text-xs text-white focus:border-[#f0cb65] focus:outline-none cursor-pointer"
                  >
                    <option value="">All Hosts</option>
                    {uniqueHosts.map((host) => (
                      <option key={host} value={host}>
                        {host}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Filter by Player"
                    value={filterPlayer}
                    onChange={(e) => setFilterPlayer(e.target.value)}
                    className="rounded-lg border border-[#d4af37]/35 bg-[#0a1f3a] px-3 py-2 text-xs text-white focus:border-[#f0cb65] focus:outline-none cursor-pointer"
                  >
                    <option value="">All Players</option>
                    {uniquePlayers.map((player) => (
                      <option key={player} value={player}>
                        {player}
                      </option>
                    ))}
                  </select>

                  {hasAnyFilter && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#d4af37]/50 bg-[#d4af37]/15 px-3 py-2 text-xs font-semibold text-[#f8e6a0] transition-colors hover:bg-[#d4af37]/25 cursor-pointer sm:col-span-1"
                    >
                      <FilterX className="h-3.5 w-3.5" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>

              {!hasAnyFilter ? (
                <div className="mt-8">
                  <p className="mb-4 font-mono text-xs tracking-wider text-[#d4af37] uppercase">
                    Choose a Bikram Sambat Year
                  </p>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {bsYears.map((yr, idx) => {
                      const yearQuizzes = quizzes.filter(
                        (q) => q.yearBS === yr
                      );
                      const firstCount = yearQuizzes.filter(
                        (q) => q.position === '1st'
                      ).length;

                      return (
                        <motion.button
                          key={yr}
                          type="button"
                          initial={{ opacity: 0, y: 20, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: idx * 0.07 }}
                          whileHover={{ y: -6, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setFilterYear(yr)}
                          className="sheen-hover group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#d4af37]/40 bg-gradient-to-br from-[#0e2a4d] via-[#0a1f3a] to-[#071528] p-6 text-left shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition-colors hover:border-[#f5dc82] cursor-pointer"
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-mono text-3xl font-bold tracking-tight text-[#f8e6a0] group-hover:text-white">
                              {yr}
                            </span>
                            <div className="rounded-xl border border-[#7c4d2b]/60 bg-[#7c4d2b]/25 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#f5c08D]">
                              B.S.
                            </div>
                          </div>

                          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-[#f5f5f0]/80">
                            <span>
                              {yearQuizzes.length}{' '}
                              {yearQuizzes.length === 1 ? 'Quiz' : 'Quizzes'}
                            </span>
                            {firstCount > 0 && (
                              <span className="font-semibold text-[#f0cb65]">
                                {firstCount} Gold {firstCount === 1 ? 'Win' : 'Wins'}
                              </span>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-8">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#d4af37]/40 bg-[#07162b] px-3.5 py-2 text-xs font-semibold text-[#f8e6a0] transition-colors hover:border-[#f0cb65] hover:bg-[#0f294a] cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Back to All Years</span>
                    </button>

                    <p className="font-mono text-xs text-[#f5f5f0]/80">
                      Showing {filteredQuizzes.length}{' '}
                      {filteredQuizzes.length === 1 ? 'record' : 'records'}
                      {filterYear ? ` · ${filterYear} B.S.` : ''}
                    </p>
                  </div>

                  {filteredQuizzes.length === 0 ? (
                    <div className="rounded-2xl border border-white/15 bg-[#07162b] p-12 text-center">
                      <Trophy className="mx-auto h-10 w-10 text-[#d4af37]/50" />
                      <h3 className="mt-3 font-display text-xl font-bold text-white">
                        No Matching Quiz Records
                      </h3>
                      <p className="mt-1 text-sm text-[#f5f5f0]/70">
                        Try clearing one of your active filters.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredQuizzes.map((quiz, idx) => {
                        const theme = getQuizCardTheme(quiz.position);
                        return (
                          <motion.button
                            key={quiz.id}
                            type="button"
                            initial={{ opacity: 0, y: 22, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                              duration: 0.42,
                              delay: idx * 0.06,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            whileHover={{ y: -7, scale: 1.02 }}
                            whileTap={{ scale: 0.985 }}
                            onClick={() => setSelectedQuiz(quiz)}
                            className={`sheen-hover group relative flex min-h-[215px] flex-col items-center justify-center overflow-hidden rounded-2xl border p-6 text-center transition-all duration-300 cursor-pointer ${theme.wrapper}`}
                          >
                            <div
                              aria-hidden="true"
                              className={`pointer-events-none absolute inset-0 ${theme.aura}`}
                            />

                            <div className="relative z-10 flex flex-col items-center">
                              <PositionCrownOrEmblem
                                position={quiz.position}
                                className="h-14 w-14"
                              />
                              <span
                                className={`mt-3 font-mono text-xs font-bold tracking-wider uppercase ${theme.labelColor}`}
                              >
                                {quiz.position === 'Not Qualified'
                                  ? 'Not Qualified'
                                  : `${quiz.position} Place`}
                              </span>
                              <h3 className="mt-2 font-display text-lg font-bold leading-snug text-white group-hover:text-[#f8e6a0]">
                                {quiz.quizName}
                              </h3>
                              <span className="mt-4 text-[11px] font-medium text-white/55 transition-colors group-hover:text-white/90">
                                Click to inspect details
                              </span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ================= 4. SQUAD SYNERGY SUB-TAB ================= */}
          {subTab === 'synergy' && (
            <motion.div
              key="synergy"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl border border-[#d4af37]/40 bg-[#08080a] p-6 text-[#f5f2eb] shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:p-10"
            >
              {/* Header & Filters */}
              <div className="flex flex-col justify-between gap-5 border-b border-[#d4af37]/20 pb-7 lg:flex-row lg:items-end">
                <div>
                  <p className="font-mono text-xs tracking-[0.2em] text-[#d4af37] uppercase">
                    Teammate Chemistry & Podium Analytics
                  </p>
                  <h2 className="mt-1.5 font-display text-2xl font-bold text-[#f8e6a0] sm:text-3xl">
                    Squad Synergy
                  </h2>
                  <p className="mt-1.5 text-xs text-neutral-400">
                    Tracks 1st, 2nd, and 3rd podium finishes together across
                    External Wins. Filter by B.S. year or search any player.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Search Player Input */}
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#d4af37]/70" />
                    <input
                      type="text"
                      value={synergySearch}
                      onChange={(e) => setSynergySearch(e.target.value)}
                      placeholder="Search player name..."
                      className="w-48 rounded-xl border border-[#d4af37]/40 bg-[#12110d] py-2.5 pl-8 pr-8 text-xs text-white placeholder-neutral-500 focus:border-[#f0cb65] focus:outline-none sm:w-52"
                    />
                    {synergySearch && (
                      <button
                        type="button"
                        onClick={() => setSynergySearch('')}
                        aria-label="Clear player search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Year-wise B.S. Filter */}
                  <select
                    aria-label="Filter synergy by B.S. year"
                    value={synergyYear}
                    onChange={(e) => setSynergyYear(e.target.value)}
                    className="rounded-xl border border-[#d4af37]/40 bg-[#12110d] px-3.5 py-2.5 font-mono text-xs font-semibold text-[#f8e6a0] focus:border-[#f0cb65] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All B.S. Years</option>
                    {bsYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr} B.S.
                      </option>
                    ))}
                  </select>

                  {/* Sort Category */}
                  <select
                    aria-label="Sort squad synergy"
                    value={synergySort}
                    onChange={(e) =>
                      setSynergySort(
                        e.target.value as
                          | 'podiums'
                          | 'first'
                          | 'second'
                          | 'third'
                          | 'points'
                          | 'qual-rate'
                      )
                    }
                    className="rounded-xl border border-[#d4af37]/40 bg-[#12110d] px-3.5 py-2.5 text-xs font-semibold text-[#f8e6a0] focus:border-[#f0cb65] focus:outline-none cursor-pointer"
                  >
                    <option value="podiums">Sort: Total Podiums (1st–3rd)</option>
                    <option value="first">Sort: Most 1st Places</option>
                    <option value="second">Sort: Most 2nd Places</option>
                    <option value="third">Sort: Most 3rd Places</option>
                    <option value="points">Sort: Highest Points</option>
                    <option value="qual-rate">Sort: Highest Qual %</option>
                  </select>
                </div>
              </div>

              {/* Quick Player Filter Chips */}
              {uniquePlayers.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-neutral-400 uppercase">
                    Quick Filter:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSynergySearch('')}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      !synergySearch
                        ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#f8e6a0]'
                        : 'border-white/15 bg-white/5 text-neutral-300 hover:text-white'
                    }`}
                  >
                    All Players
                  </button>
                  {uniquePlayers.map((pl) => {
                    const active =
                      synergySearch.trim().toLowerCase() === pl.toLowerCase();
                    return (
                      <button
                        key={pl}
                        type="button"
                        onClick={() =>
                          setSynergySearch(active ? '' : pl)
                        }
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                          active
                            ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#f8e6a0]'
                            : 'border-white/15 bg-white/5 text-neutral-300 hover:border-[#d4af37]/40 hover:text-white'
                        }`}
                      >
                        {pl}
                      </button>
                    );
                  })}
                </div>
              )}

              {synergyRows.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-[#d4af37]/20 bg-[#11100d] p-12 text-center">
                  <Users className="mx-auto h-9 w-9 text-[#d4af37]/60" />
                  <p className="mt-3 text-sm text-neutral-300">
                    No teammate pairs found for this year or player filter.
                  </p>
                </div>
              ) : (
                <>
                  {/* Top 3 Synergy Spotlight Cards */}
                  <div className="mt-7 grid gap-4 md:grid-cols-3">
                    {synergyRows.slice(0, 3).map((pair, idx) => (
                      <motion.div
                        key={pair.key}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.15 }}
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.35, delay: idx * 0.06 }}
                        className={`rounded-2xl border p-5 ${
                          idx === 0
                            ? 'border-[#d4af37]/60 bg-gradient-to-br from-[#1d1709] to-[#0e0c08] shadow-[0_14px_40px_rgba(212,175,55,0.14)]'
                            : idx === 1
                              ? 'border-slate-300/40 bg-gradient-to-br from-[#151a24] to-[#0c0d11]'
                              : 'border-[#b86b35]/45 bg-gradient-to-br from-[#1c110b] to-[#0d0a08]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-[#d4af37]">
                            #{idx + 1} DUO SYNERGY
                          </span>
                          <span className="font-mono text-xs font-bold text-[#f8e6a0]">
                            {pair.qualRate}% Qual.
                          </span>
                        </div>
                        <h3 className="mt-2 font-display text-lg font-bold text-white">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCareerPlayer(pair.playerA)
                            }
                            className="hover:text-[#f8e6a0] hover:underline cursor-pointer"
                          >
                            {pair.playerA}
                          </button>{' '}
                          <span className="text-[#d4af37]">&amp;</span>{' '}
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCareerPlayer(pair.playerB)
                            }
                            className="hover:text-[#f8e6a0] hover:underline cursor-pointer"
                          >
                            {pair.playerB}
                          </button>
                        </h3>

                        <div className="mt-4 grid grid-cols-4 gap-2 text-center font-mono text-xs">
                          <div className="rounded-lg border border-[#d4af37]/25 bg-black/30 py-2">
                            <span className="block text-[10px] text-[#f5dc82]">
                              1st
                            </span>
                            <span className="font-bold text-white">
                              {pair.first}
                            </span>
                          </div>
                          <div className="rounded-lg border border-slate-300/20 bg-black/30 py-2">
                            <span className="block text-[10px] text-slate-300">
                              2nd
                            </span>
                            <span className="font-bold text-white">
                              {pair.second}
                            </span>
                          </div>
                          <div className="rounded-lg border border-[#b86b35]/25 bg-black/30 py-2">
                            <span className="block text-[10px] text-[#f5c08D]">
                              3rd
                            </span>
                            <span className="font-bold text-white">
                              {pair.third}
                            </span>
                          </div>
                          <div className="rounded-lg border border-emerald-400/25 bg-black/30 py-2">
                            <span className="block text-[10px] text-emerald-300">
                              Podiums
                            </span>
                            <span className="font-bold text-emerald-200">
                              {pair.podiums}
                            </span>
                          </div>
                        </div>

                        <p className="mt-3 font-mono text-[11px] text-neutral-400">
                          {pair.qualified}/{pair.totalQuizzes} Qualified ·{' '}
                          <span className="text-[#f0cb65]">
                            {pair.points} pts
                          </span>
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Full Pair Breakdown Table (Desktop) */}
                  <div className="mt-7 hidden overflow-hidden rounded-2xl border border-[#d4af37]/30 bg-[#0d0c09] md:block">
                    <table className="w-full table-fixed border-collapse text-left">
                      <thead>
                        <tr className="border-b border-[#d4af37]/25 bg-[#15120b] font-mono text-xs tracking-wider text-[#f5dc82] uppercase">
                          <th className="w-[8%] py-3.5 pl-5">Rank</th>
                          <th className="w-[30%] py-3.5 px-2">Teammate Pair</th>
                          <th className="w-[8%] py-3.5 text-center">1st</th>
                          <th className="w-[8%] py-3.5 text-center">2nd</th>
                          <th className="w-[8%] py-3.5 text-center">3rd</th>
                          <th className="w-[10%] py-3.5 text-center">Podiums</th>
                          <th className="w-[10%] py-3.5 text-center">Quizzes</th>
                          <th className="w-[9%] py-3.5 text-center">Qual %</th>
                          <th className="w-[9%] py-3.5 pr-5 text-right">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#d4af37]/12 text-sm tabular-nums">
                        {synergyRows.map((pair, idx) => (
                          <motion.tr
                            key={pair.key}
                            initial={{ opacity: 0, x: -12 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, amount: 0.15 }}
                            whileHover={{ x: 4 }}
                            transition={{
                              duration: 0.28,
                              delay: Math.min(idx * 0.03, 0.2),
                            }}
                            className="transition-colors hover:bg-[#d4af37]/10 hover:shadow-[inset_2px_0_0_#d4af37]"
                          >
                            <td className="py-3.5 pl-5 font-mono text-xs font-bold text-[#d4af37]">
                              #{idx + 1}
                            </td>
                            <td className="py-3.5 px-2 font-semibold text-white">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedCareerPlayer(pair.playerA)
                                }
                                className="hover:text-[#f8e6a0] hover:underline cursor-pointer"
                              >
                                {pair.playerA}
                              </button>{' '}
                              <span className="text-[#d4af37]">+</span>{' '}
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedCareerPlayer(pair.playerB)
                                }
                                className="hover:text-[#f8e6a0] hover:underline cursor-pointer"
                              >
                                {pair.playerB}
                              </button>
                            </td>
                            <td className="py-3.5 text-center font-mono font-semibold text-[#f8e6a0]">
                              {pair.first}
                            </td>
                            <td className="py-3.5 text-center font-mono text-slate-200">
                              {pair.second}
                            </td>
                            <td className="py-3.5 text-center font-mono text-[#f5c08D]">
                              {pair.third}
                            </td>
                            <td className="py-3.5 text-center font-mono font-bold text-emerald-300">
                              {pair.podiums}
                            </td>
                            <td className="py-3.5 text-center font-mono text-neutral-300">
                              {pair.totalQuizzes}
                            </td>
                            <td className="py-3.5 text-center font-mono text-emerald-200">
                              {pair.qualRate}%
                            </td>
                            <td className="py-3.5 pr-5 text-right font-mono font-bold text-[#f0cb65]">
                              {pair.points}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Synergy Cards */}
                  <div className="mt-6 space-y-3 md:hidden">
                    {synergyRows.map((pair, idx) => (
                      <div
                        key={pair.key}
                        className="rounded-2xl border border-[#d4af37]/30 bg-[#100e0a] p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-display text-base font-bold text-white">
                            <span className="mr-2 font-mono text-xs text-[#d4af37]">
                              #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedCareerPlayer(pair.playerA)
                              }
                              className="hover:text-[#f8e6a0] hover:underline cursor-pointer"
                            >
                              {pair.playerA}
                            </button>{' '}
                            <span className="text-[#d4af37]">&amp;</span>{' '}
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedCareerPlayer(pair.playerB)
                              }
                              className="hover:text-[#f8e6a0] hover:underline cursor-pointer"
                            >
                              {pair.playerB}
                            </button>
                          </p>
                          <span className="font-mono text-xs font-bold text-[#f0cb65]">
                            {pair.points} pts
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-2 text-center font-mono text-xs">
                          <div className="rounded bg-white/5 py-1.5">
                            <span className="block text-[10px] text-[#f5dc82]">
                              1st
                            </span>
                            <span className="font-bold">{pair.first}</span>
                          </div>
                          <div className="rounded bg-white/5 py-1.5">
                            <span className="block text-[10px] text-slate-300">
                              2nd
                            </span>
                            <span className="font-bold">{pair.second}</span>
                          </div>
                          <div className="rounded bg-white/5 py-1.5">
                            <span className="block text-[10px] text-[#f5c08D]">
                              3rd
                            </span>
                            <span className="font-bold">{pair.third}</span>
                          </div>
                          <div className="rounded bg-white/5 py-1.5">
                            <span className="block text-[10px] text-emerald-300">
                              Qual %
                            </span>
                            <span className="font-bold text-emerald-200">
                              {pair.qualRate}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ================= 5. HEAD-TO-HEAD COMPARE SUB-TAB (EXCLUDES STANDINGS POINTS) ================= */}
          {subTab === 'head-to-head' && (
            <motion.div
              key="head-to-head"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl border border-[#d4af37]/40 bg-[#08080a] p-6 text-[#f5f2eb] shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:p-10"
            >
              {/* Header & Player Selectors */}
              <div className="flex flex-col justify-between gap-5 border-b border-[#d4af37]/20 pb-7 lg:flex-row lg:items-end">
                <div>
                  <p className="font-mono text-xs tracking-[0.2em] text-[#d4af37] uppercase">
                    Direct Comparison · External Wins Only
                  </p>
                  <h2 className="mt-1.5 font-display text-2xl font-bold text-[#f8e6a0] sm:text-3xl">
                    Head-to-Head Compare
                  </h2>
                  <p className="mt-1.5 text-xs text-neutral-400">
                    Compare placements, qualification consistency, and shared
                    team chemistry side by side.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    aria-label="Filter Head-to-Head by B.S. year"
                    value={h2hYear}
                    onChange={(e) => setH2hYear(e.target.value)}
                    className="rounded-xl border border-[#d4af37]/40 bg-[#12110d] px-3.5 py-2.5 font-mono text-xs font-semibold text-[#f8e6a0] focus:border-[#f0cb65] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All B.S. Years</option>
                    {bsYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr} B.S.
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {uniquePlayers.length === 0 || !h2hData ? (
                <div className="mt-8 rounded-2xl border border-[#d4af37]/20 bg-[#11100d] p-12 text-center">
                  <Swords className="mx-auto h-9 w-9 text-[#d4af37]/60" />
                  <p className="mt-3 text-sm text-neutral-300">
                    Add quizzes with participating players to unlock Head-to-Head
                    comparisons.
                  </p>
                </div>
              ) : (
                <div className="mt-7 space-y-7">
                  {/* Player Picker Duel Bar */}
                  <div className="grid items-center gap-4 rounded-2xl border border-white/10 bg-[#11100c] p-5 md:grid-cols-11">
                    <div className="md:col-span-5">
                      <label className="mb-1.5 block font-mono text-[10px] font-bold tracking-wider text-[#f5dc82] uppercase">
                        Challenger A
                      </label>
                      <select
                        aria-label="Select Player A"
                        value={h2hPlayerA}
                        onChange={(e) => setH2hPlayerA(e.target.value)}
                        className="w-full rounded-xl border border-[#d4af37]/45 bg-[#19160e] px-3.5 py-2.5 text-sm font-bold text-[#f8e6a0] focus:border-[#f0cb65] focus:outline-none cursor-pointer"
                      >
                        {uniquePlayers.map((pl) => (
                          <option key={pl} value={pl}>
                            {pl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-center md:col-span-1">
                      <button
                        type="button"
                        onClick={() => {
                          setH2hPlayerA(h2hPlayerB);
                          setH2hPlayerB(h2hPlayerA);
                        }}
                        title="Swap Players"
                        aria-label="Swap Player A and Player B"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#17140d] text-[#f5dc82] transition-transform hover:scale-105 hover:bg-[#d4af37]/20 cursor-pointer"
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="md:col-span-5">
                      <label className="mb-1.5 block font-mono text-[10px] font-bold tracking-wider text-sky-300 uppercase">
                        Challenger B
                      </label>
                      <select
                        aria-label="Select Player B"
                        value={h2hPlayerB}
                        onChange={(e) => setH2hPlayerB(e.target.value)}
                        className="w-full rounded-xl border border-sky-400/40 bg-[#0d1624] px-3.5 py-2.5 text-sm font-bold text-sky-200 focus:border-sky-300 focus:outline-none cursor-pointer"
                      >
                        {uniquePlayers.map((pl) => (
                          <option key={pl} value={pl}>
                            {pl}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Summary Duel Cards (No Standings Points) */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <motion.div
                      key={`card-a-${h2hData.a.name}-${h2hYear}`}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="rounded-2xl border border-[#d4af37]/45 bg-gradient-to-br from-[#1b160a] to-[#0c0b08] p-5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold tracking-widest text-[#d4af37] uppercase">
                          Corner A
                        </span>
                        <span className="font-mono text-xs font-bold text-[#f5dc82]">
                          {h2hData.a.qualRate}% Qualified
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCareerPlayer(h2hData.a.name)
                        }
                        className="mt-1.5 block text-left font-display text-2xl font-bold text-[#f8e6a0] hover:underline cursor-pointer"
                      >
                        {h2hData.a.name}
                      </button>
                      <div className="mt-4 grid grid-cols-2 gap-2.5 text-center font-mono text-xs sm:grid-cols-4">
                        <div className="rounded-xl border border-[#d4af37]/25 bg-black/35 py-2.5">
                          <span className="block text-[10px] text-neutral-400">
                            Quizzes
                          </span>
                          <span className="text-base font-bold text-white">
                            {h2hData.a.totalQuizzes}
                          </span>
                        </div>
                        <div className="rounded-xl border border-[#d4af37]/25 bg-black/35 py-2.5">
                          <span className="block text-[10px] text-neutral-400">
                            Podiums
                          </span>
                          <span className="text-base font-bold text-[#f8e6a0]">
                            {h2hData.a.podiums}
                          </span>
                        </div>
                        <div className="rounded-xl border border-[#d4af37]/25 bg-black/35 py-2.5">
                          <span className="block text-[10px] text-neutral-400">
                            Qualified
                          </span>
                          <span className="text-base font-bold text-emerald-300">
                            {h2hData.a.qualified}
                          </span>
                        </div>
                        <div className="rounded-xl border border-[#d4af37]/25 bg-black/35 py-2.5">
                          <span className="block text-[10px] text-neutral-400">
                            Avg Rating
                          </span>
                          <span className="text-base font-bold text-[#f5dc82]">
                            {h2hData.a.avgRating}/10
                          </span>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      key={`card-b-${h2hData.b.name}-${h2hYear}`}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="rounded-2xl border border-sky-400/40 bg-gradient-to-br from-[#0c192b] to-[#080d14] p-5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold tracking-widest text-sky-300 uppercase">
                          Corner B
                        </span>
                        <span className="font-mono text-xs font-bold text-sky-200">
                          {h2hData.b.qualRate}% Qualified
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCareerPlayer(h2hData.b.name)
                        }
                        className="mt-1.5 block text-left font-display text-2xl font-bold text-white hover:text-sky-200 hover:underline cursor-pointer"
                      >
                        {h2hData.b.name}
                      </button>
                      <div className="mt-4 grid grid-cols-2 gap-2.5 text-center font-mono text-xs sm:grid-cols-4">
                        <div className="rounded-xl border border-sky-400/20 bg-black/35 py-2.5">
                          <span className="block text-[10px] text-neutral-400">
                            Quizzes
                          </span>
                          <span className="text-base font-bold text-white">
                            {h2hData.b.totalQuizzes}
                          </span>
                        </div>
                        <div className="rounded-xl border border-sky-400/20 bg-black/35 py-2.5">
                          <span className="block text-[10px] text-neutral-400">
                            Podiums
                          </span>
                          <span className="text-base font-bold text-sky-200">
                            {h2hData.b.podiums}
                          </span>
                        </div>
                        <div className="rounded-xl border border-sky-400/20 bg-black/35 py-2.5">
                          <span className="block text-[10px] text-neutral-400">
                            Qualified
                          </span>
                          <span className="text-base font-bold text-emerald-300">
                            {h2hData.b.qualified}
                          </span>
                        </div>
                        <div className="rounded-xl border border-sky-400/20 bg-black/35 py-2.5">
                          <span className="block text-[10px] text-neutral-400">
                            Avg Rating
                          </span>
                          <span className="text-base font-bold text-sky-200">
                            {h2hData.b.avgRating}/10
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Animated Metric-by-Metric Comparison Bars (No Standings Points) */}
                  <div className="space-y-4 rounded-2xl border border-[#d4af37]/25 bg-[#0d0c09] p-5 sm:p-6">
                    <h4 className="font-mono text-xs font-bold tracking-wider text-[#d4af37] uppercase">
                      Stat-by-Stat Comparison
                    </h4>
                    {[
                      {
                        label: 'Average Player Rating (/10)',
                        valA: h2hData.a.avgRating,
                        valB: h2hData.b.avgRating,
                        suffix: '/10',
                      },
                      {
                        label: '1st Place Wins (Gold)',
                        valA: h2hData.a.first,
                        valB: h2hData.b.first,
                        suffix: '',
                      },
                      {
                        label: '2nd Place Finishes (Silver)',
                        valA: h2hData.a.second,
                        valB: h2hData.b.second,
                        suffix: '',
                      },
                      {
                        label: '3rd Place Finishes (Bronze)',
                        valA: h2hData.a.third,
                        valB: h2hData.b.third,
                        suffix: '',
                      },
                      {
                        label: '4th – 6th Placements',
                        valA: h2hData.a.top46,
                        valB: h2hData.b.top46,
                        suffix: '',
                      },
                      {
                        label: 'Total Top-3 Podiums',
                        valA: h2hData.a.podiums,
                        valB: h2hData.b.podiums,
                        suffix: '',
                      },
                      {
                        label: 'Total Quizzes Played',
                        valA: h2hData.a.totalQuizzes,
                        valB: h2hData.b.totalQuizzes,
                        suffix: '',
                      },
                      {
                        label: 'Qualification Rate',
                        valA: h2hData.a.qualRate,
                        valB: h2hData.b.qualRate,
                        suffix: '%',
                      },
                      {
                        label: 'Podium Rate',
                        valA: h2hData.a.podiumRate,
                        valB: h2hData.b.podiumRate,
                        suffix: '%',
                      },
                    ].map((metric, mIdx) => {
                      const total = metric.valA + metric.valB;
                      const pctA =
                        total > 0 ? Math.round((metric.valA / total) * 100) : 50;
                      const pctB = 100 - pctA;
                      const lead =
                        metric.valA > metric.valB
                          ? 'A'
                          : metric.valB > metric.valA
                            ? 'B'
                            : 'TIE';
                      return (
                        <div key={metric.label} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span
                              className={`font-mono font-bold tabular-nums ${
                                lead === 'A'
                                  ? 'text-[#f8e6a0]'
                                  : 'text-neutral-300'
                              }`}
                            >
                              {metric.valA}
                              {metric.suffix}
                            </span>
                            <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
                              {metric.label}
                            </span>
                            <span
                              className={`font-mono font-bold tabular-nums ${
                                lead === 'B'
                                  ? 'text-sky-300'
                                  : 'text-neutral-300'
                              }`}
                            >
                              {metric.valB}
                              {metric.suffix}
                            </span>
                          </div>
                          <div className="flex h-2.5 overflow-hidden rounded-full bg-white/10">
                            <motion.div
                              initial={{ width: '50%' }}
                              animate={{ width: `${pctA}%` }}
                              transition={{
                                duration: 0.45,
                                delay: mIdx * 0.03,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                              className="bg-gradient-to-r from-[#b8861b] to-[#f0cb65]"
                            />
                            <motion.div
                              initial={{ width: '50%' }}
                              animate={{ width: `${pctB}%` }}
                              transition={{
                                duration: 0.45,
                                delay: mIdx * 0.03,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                              className="bg-gradient-to-r from-sky-500 to-cyan-300"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Shared Quizzes Together */}
                  <div className="rounded-2xl border border-emerald-400/25 bg-[#0a1310] p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                      <div>
                        <p className="font-mono text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
                          Shared Teammate Record
                        </p>
                        <h4 className="mt-1 font-display text-lg font-bold text-white">
                          {h2hPlayerA === h2hPlayerB
                            ? 'Select two different players to view shared quizzes'
                            : `${h2hData.a.name} & ${h2hData.b.name} Together`}
                        </h4>
                      </div>
                      {h2hPlayerA !== h2hPlayerB && (
                        <div className="flex flex-wrap gap-3 font-mono text-xs">
                          <span className="rounded-lg border border-white/10 bg-black/35 px-3 py-1.5 text-neutral-200">
                            {h2hData.sharedQuizzes.length} Shared Quizzes
                          </span>
                          <span className="rounded-lg border border-[#d4af37]/30 bg-black/35 px-3 py-1.5 text-[#f8e6a0]">
                            {h2hData.sharedWins} Gold Wins
                          </span>
                          <span className="rounded-lg border border-emerald-400/30 bg-black/35 px-3 py-1.5 text-emerald-200">
                            {h2hData.sharedPodiums} Podiums ({h2hData.sharedQualRate}% Qual)
                          </span>
                        </div>
                      )}
                    </div>

                    {h2hPlayerA !== h2hPlayerB && (
                      <div className="mt-4">
                        {h2hData.sharedQuizzes.length === 0 ? (
                          <p className="text-xs text-neutral-400">
                            These two players have not competed on the same team
                            in {h2hYear === 'all' ? 'any recorded quiz' : `${h2hYear} B.S.`}.
                          </p>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {h2hData.sharedQuizzes.map((sq) => (
                              <button
                                key={sq.id}
                                type="button"
                                onClick={() => setSelectedQuiz(sq)}
                                className="rounded-xl border border-white/10 bg-[#101c17] p-3.5 text-left transition-colors hover:border-emerald-400/45 cursor-pointer"
                              >
                                <p className="font-mono text-[11px] font-bold text-[#f5dc82]">
                                  {sq.yearBS} B.S. ·{' '}
                                  {sq.position === 'Not Qualified'
                                    ? 'Not Qualified'
                                    : `${sq.position} Place`}
                                </p>
                                <p className="mt-1 line-clamp-1 font-display text-sm font-bold text-white">
                                  {sq.quizName}
                                </p>
                                <p className="mt-1 truncate text-[11px] text-neutral-400">
                                  {sq.host}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ================= 6. B.S. ERA PROGRESSION & STREAKS SUB-TAB ================= */}
          {subTab === 'era-streaks' && (
            <motion.div
              key="era-streaks"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl border border-[#d4af37]/40 bg-[#08080a] p-6 text-[#f5f2eb] shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:p-10"
            >
              {/* Header */}
              <div className="flex flex-col justify-between gap-4 border-b border-[#d4af37]/20 pb-7 sm:flex-row sm:items-end">
                <div>
                  <p className="font-mono text-xs tracking-[0.2em] text-[#d4af37] uppercase">
                    Multi-Year Dynasty &amp; Momentum
                  </p>
                  <h2 className="mt-1.5 font-display text-2xl font-bold text-[#f8e6a0] sm:text-3xl">
                    B.S. Era Progression &amp; Streaks
                  </h2>
                  <p className="mt-1.5 text-xs text-neutral-400">
                    Tracks unbroken qualification runs, consecutive podium
                    streaks, and year-by-year growth across Bikram Sambat
                    seasons.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 self-start rounded-xl border border-[#d4af37]/30 bg-[#12110d] px-3.5 py-2 font-mono text-xs font-semibold text-[#f5dc82]">
                  <TrendingUp className="h-4 w-4 text-[#d4af37]" />
                  <span>{eraProgressionData.totalQuizzes} Total Quizzes</span>
                </span>
              </div>

              {/* Squad Streak Highlights */}
              <div className="mt-7 grid gap-4 md:grid-cols-3">
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.35 }}
                  className="rounded-2xl border border-emerald-400/35 bg-gradient-to-br from-[#0b1b16] to-[#0b0e0d] p-5 shadow-[0_12px_30px_rgba(16,185,129,0.08)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold tracking-widest text-emerald-300 uppercase">
                      Qualification Streak
                    </span>
                    <Flame className="h-4 w-4 text-emerald-300" />
                  </div>
                  <p className="mt-2 font-mono text-3xl font-extrabold text-white">
                    {eraProgressionData.bestQualStreak}
                    <span className="ml-2 text-sm font-semibold text-emerald-300">
                      Quizzes
                    </span>
                  </p>
                  <p className="mt-1 font-mono text-xs text-emerald-200/80">
                    Current active run:{' '}
                    {eraProgressionData.currentQualStreak}{' '}
                    {eraProgressionData.currentQualStreak === 1
                      ? 'quiz'
                      : 'quizzes'}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.35, delay: 0.06 }}
                  className="rounded-2xl border border-[#d4af37]/40 bg-gradient-to-br from-[#191409] to-[#0d0c09] p-5 shadow-[0_12px_30px_rgba(212,175,55,0.08)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold tracking-widest text-[#d4af37] uppercase">
                      Unbroken Podium Run
                    </span>
                    <Trophy className="h-4 w-4 text-[#f5dc82]" />
                  </div>
                  <p className="mt-2 font-mono text-3xl font-extrabold text-[#f8e6a0]">
                    {eraProgressionData.bestPodiumStreak}
                    <span className="ml-2 text-sm font-semibold text-[#d4af37]">
                      Top-3
                    </span>
                  </p>
                  <p className="mt-1 font-mono text-xs text-neutral-300">
                    Current podium streak:{' '}
                    {eraProgressionData.currentPodiumStreak} · Best Gold run:{' '}
                    {eraProgressionData.bestGoldStreak}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.35, delay: 0.12 }}
                  className="rounded-2xl border border-slate-300/35 bg-gradient-to-br from-[#131822] to-[#0b0d11] p-5 shadow-[0_12px_30px_rgba(203,213,225,0.06)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold tracking-widest text-slate-300 uppercase">
                      Peak B.S. Season
                    </span>
                    <Crown className="h-4 w-4 text-[#f5dc82]" />
                  </div>
                  <p className="mt-2 font-display text-2xl font-bold text-white">
                    {eraProgressionData.bestSeason
                      ? `${eraProgressionData.bestSeason.year} B.S.`
                      : 'No Data Yet'}
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-300">
                    {eraProgressionData.bestSeason
                      ? `${eraProgressionData.bestSeason.first} Gold · ${eraProgressionData.bestSeason.podiums} Podiums · ${eraProgressionData.bestSeason.qualRate}% Qual`
                      : 'Add quiz records to track seasons'}
                  </p>
                </motion.div>
              </div>

              {/* Year-by-Year B.S. Era Timeline */}
              <div className="mt-9">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-mono text-xs font-bold tracking-wider text-[#d4af37] uppercase">
                    Bikram Sambat Season Timeline
                  </h3>
                  <span className="text-[11px] text-neutral-400">
                    Click any year to open its External Wins
                  </span>
                </div>

                {eraProgressionData.eras.length === 0 ? (
                  <div className="rounded-2xl border border-[#d4af37]/20 bg-[#11100d] p-10 text-center">
                    <Calendar className="mx-auto h-9 w-9 text-[#d4af37]/60" />
                    <p className="mt-3 text-sm text-neutral-300">
                      No Bikram Sambat seasons recorded yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {eraProgressionData.eras.map((era, idx) => (
                      <motion.button
                        key={era.year}
                        type="button"
                        initial={{ opacity: 0, x: -14 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.15 }}
                        whileHover={{ x: 4 }}
                        transition={{
                          duration: 0.32,
                          delay: Math.min(idx * 0.05, 0.25),
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        onClick={() => {
                          setFilterYear(era.year);
                          setFilterPosition('');
                          setFilterHost('');
                          setFilterPlayer('');
                          setSubTab('external-wins');
                        }}
                        className="group block w-full rounded-2xl border border-[#d4af37]/25 bg-[#0e0d0a] p-5 text-left transition-colors hover:border-[#d4af37]/65 hover:bg-[#14120c] cursor-pointer"
                      >
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#19150b] font-mono text-lg font-extrabold text-[#f8e6a0]">
                              {era.year}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-display text-lg font-bold text-white group-hover:text-[#f8e6a0]">
                                  {era.year} B.S. Era
                                </span>
                                {era.standoutPlayer && (
                                  <span className="rounded-md border border-[#d4af37]/30 bg-[#d4af37]/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#f5dc82]">
                                    Standout: {era.standoutPlayer}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 font-mono text-xs text-neutral-400">
                                {era.total}{' '}
                                {era.total === 1 ? 'Quiz' : 'Quizzes'} ·{' '}
                                {era.qualified} Qualified ({era.qualRate}%) ·{' '}
                                {era.podiums} Top-3 Podiums
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                            <span className="rounded-lg border border-[#d4af37]/35 bg-[#d4af37]/12 px-2.5 py-1 font-bold text-[#f8e6a0]">
                              {era.first} Gold
                            </span>
                            <span className="rounded-lg border border-slate-300/25 bg-slate-300/10 px-2.5 py-1 text-slate-200">
                              {era.second} Silver
                            </span>
                            <span className="rounded-lg border border-[#b86b35]/35 bg-[#b86b35]/12 px-2.5 py-1 text-[#f5c08D]">
                              {era.third} Bronze
                            </span>
                          </div>
                        </div>

                        {/* Animated Era Bars */}
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div>
                            <div className="mb-1 flex justify-between font-mono text-[10px] text-neutral-400">
                              <span>Qualification Rate</span>
                              <span className="text-emerald-300">
                                {era.qualRate}%
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                              <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${era.qualRate}%` }}
                                viewport={{ once: true, amount: 0.2 }}
                                transition={{ duration: 0.55, delay: 0.08 }}
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="mb-1 flex justify-between font-mono text-[10px] text-neutral-400">
                              <span>Podium Rate (1st–3rd)</span>
                              <span className="text-[#f5dc82]">
                                {era.podiumRate}%
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                              <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${era.podiumRate}%` }}
                                viewport={{ once: true, amount: 0.2 }}
                                transition={{ duration: 0.55, delay: 0.14 }}
                                className="h-full rounded-full bg-gradient-to-r from-[#b8861b] to-[#f8e6a0]"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {/* Player Streak Leaderboard */}
              {eraProgressionData.playerStreaks.length > 0 && (
                <div className="mt-9">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-mono text-xs font-bold tracking-wider text-[#d4af37] uppercase">
                      Individual Player Streak Records
                    </h3>
                    <span className="text-[11px] text-neutral-400">
                      Click any player for full career dossier
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {eraProgressionData.playerStreaks.map((ps, idx) => (
                      <motion.div
                        key={ps.player}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.15 }}
                        transition={{
                          duration: 0.3,
                          delay: Math.min(idx * 0.04, 0.2),
                        }}
                        className="rounded-2xl border border-[#d4af37]/25 bg-[#0d0c09] p-4 transition-colors hover:border-[#d4af37]/55"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCareerPlayer(ps.player)
                            }
                            className="truncate text-left font-display text-base font-bold text-[#f8e6a0] hover:underline cursor-pointer"
                          >
                            {ps.player}
                          </button>
                          <span className="shrink-0 font-mono text-[11px] text-neutral-400">
                            {ps.totalQuizzes} Quizzes
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2 text-center font-mono text-xs">
                          <div className="rounded-lg bg-white/5 py-2">
                            <span className="block text-[10px] text-emerald-300">
                              Best Qual
                            </span>
                            <span className="font-bold text-white">
                              {ps.bestQualStreak}
                            </span>
                          </div>
                          <div className="rounded-lg bg-white/5 py-2">
                            <span className="block text-[10px] text-[#f5dc82]">
                              Best Podium
                            </span>
                            <span className="font-bold text-white">
                              {ps.bestPodiumStreak}
                            </span>
                          </div>
                          <div className="rounded-lg bg-white/5 py-2">
                            <span className="block text-[10px] text-sky-300">
                              Active Qual
                            </span>
                            <span className="font-bold text-white">
                              {ps.currentQualStreak}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ================= 7. DQR SEASON WRAPPED SUB-TAB ================= */}
          {subTab === 'season-wrapped' && (
            <motion.div
              key="season-wrapped"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl border border-[#d4af37]/45 bg-gradient-to-b from-[#0a1628] via-[#09090d] to-[#0b0a08] p-6 text-[#f5f2eb] shadow-[0_24px_80px_rgba(0,0,0,0.7)] sm:p-10"
            >
              {/* Header + Season Picker */}
              <div className="flex flex-col justify-between gap-4 border-b border-[#d4af37]/20 pb-6 lg:flex-row lg:items-end">
                <div>
                  <p className="font-mono text-xs tracking-[0.22em] text-[#d4af37] uppercase">
                    Interactive Retrospective · Bikram Sambat Recap
                  </p>
                  <h2 className="mt-1.5 font-display text-2xl font-bold text-[#f8e6a0] sm:text-4xl">
                    DQR Season Wrapped
                  </h2>
                  <p className="mt-1.5 text-xs text-neutral-400">
                    Swipe or step through the defining numbers, sovereigns,
                    highest-rated players, chemistry duos, and signature victory
                    for any B.S. season.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWrappedYear('all');
                      setWrappedSlide(0);
                    }}
                    className={`rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition-colors cursor-pointer ${
                      wrappedYear === 'all'
                        ? 'border-[#f5dc82] bg-[#d4af37] text-[#08080a]'
                        : 'border-[#d4af37]/30 bg-[#12110d] text-[#f5dc82] hover:border-[#d4af37]'
                    }`}
                  >
                    All-Time
                  </button>
                  {bsYears.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setWrappedYear(yr);
                        setWrappedSlide(0);
                      }}
                      className={`rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition-colors cursor-pointer ${
                        wrappedYear === yr
                          ? 'border-[#f5dc82] bg-[#d4af37] text-[#08080a]'
                          : 'border-[#d4af37]/30 bg-[#12110d] text-[#f5dc82] hover:border-[#d4af37]'
                      }`}
                    >
                      {yr} B.S.
                    </button>
                  ))}
                </div>
              </div>

              {wrappedData.totalQuizzes === 0 ? (
                <div className="mt-8 rounded-2xl border border-[#d4af37]/25 bg-[#100f0c] p-12 text-center">
                  <Sparkles className="mx-auto h-10 w-10 text-[#d4af37]/60" />
                  <h3 className="mt-3 font-display text-xl font-bold text-[#f8e6a0]">
                    No Quizzes Recorded for {wrappedData.label}
                  </h3>
                  <p className="mt-1 text-xs text-neutral-400">
                    Choose another Bikram Sambat year above or add quiz records
                    in the Admin Studio.
                  </p>
                </div>
              ) : (
                <div className="mt-7 space-y-6">
                  {/* Story Progress Bars + Controls */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="grid flex-1 grid-cols-5 gap-2">
                      {[
                        '01 Overview',
                        '02 Sovereigns',
                        '03 Duo',
                        '04 Streaks',
                        '05 Poster',
                      ].map((label, idx) => {
                        const isActive = wrappedSlide === idx;
                        const isDone = idx < wrappedSlide;
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setWrappedSlide(idx)}
                            className="group text-left cursor-pointer"
                          >
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isActive
                                    ? 'w-full bg-gradient-to-r from-[#d4af37] to-[#fff0a8]'
                                    : isDone
                                      ? 'w-full bg-[#d4af37]/65'
                                      : 'w-0'
                                }`}
                              />
                            </div>
                            <span
                              className={`mt-1.5 hidden font-mono text-[10px] font-bold sm:block ${
                                isActive
                                  ? 'text-[#f8e6a0]'
                                  : 'text-neutral-400 group-hover:text-neutral-200'
                              }`}
                            >
                              {label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() =>
                          setWrappedSlide((s) => (s - 1 + 5) % 5)
                        }
                        aria-label="Previous wrapped slide"
                        className="inline-flex items-center gap-1 rounded-xl border border-[#d4af37]/35 bg-[#12110d] px-3 py-2 text-xs font-semibold text-[#f5dc82] hover:border-[#d4af37] cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Prev</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWrappedSlide((s) => (s + 1) % 5)}
                        aria-label="Next wrapped slide"
                        className="inline-flex items-center gap-1 rounded-xl bg-[#d4af37] px-3.5 py-2 text-xs font-bold text-[#08080a] hover:bg-[#e7c44d] cursor-pointer"
                      >
                        <span>Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Interactive Slide Stage */}
                  <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/35 bg-[#090d16] p-6 shadow-inner sm:p-9">
                    <AnimatePresence mode="wait">
                      {/* SLIDE 0: OVERVIEW */}
                      {wrappedSlide === 0 && (
                        <motion.div
                          key={`wrap-0-${wrappedYear}`}
                          initial={{ opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -24 }}
                          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-6"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#d4af37] uppercase">
                                Chapter 01 · Season Footprint
                              </span>
                              <h3 className="mt-1 font-display text-3xl font-bold text-white sm:text-4xl">
                                {wrappedData.label} in Numbers
                              </h3>
                            </div>
                            <div className="rounded-2xl border border-[#d4af37]/40 bg-[#18140b] px-4 py-2 text-right">
                              <span className="block font-mono text-[10px] text-neutral-400 uppercase">
                                Avg Quiz Rating
                              </span>
                              <span className="font-mono text-xl font-extrabold text-[#f8e6a0]">
                                {wrappedData.avgQuizRating} / 10
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                              <span className="font-mono text-[11px] text-neutral-400 uppercase">
                                Competitions Entered
                              </span>
                              <p className="mt-2 font-mono text-4xl font-extrabold text-white">
                                {wrappedData.totalQuizzes}
                              </p>
                              <p className="mt-1 text-xs text-neutral-400">
                                {wrappedData.roster.length} unique players fielded
                              </p>
                            </div>
                            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
                              <span className="font-mono text-[11px] text-emerald-300 uppercase">
                                Qualification Rate
                              </span>
                              <p className="mt-2 font-mono text-4xl font-extrabold text-emerald-200">
                                {wrappedData.qualRate}%
                              </p>
                              <p className="mt-1 text-xs text-emerald-200/80">
                                {wrappedData.qualified} finals reached
                              </p>
                            </div>
                            <div className="rounded-2xl border border-[#d4af37]/35 bg-[#d4af37]/10 p-5">
                              <span className="font-mono text-[11px] text-[#f5dc82] uppercase">
                                Top-3 Podiums
                              </span>
                              <p className="mt-2 font-mono text-4xl font-extrabold text-[#f8e6a0]">
                                {wrappedData.podiums}
                              </p>
                              <p className="mt-1 text-xs text-[#f5dc82]/80">
                                {wrappedData.podiumRate}% podium finish rate
                              </p>
                            </div>
                            <div className="rounded-2xl border border-amber-300/35 bg-gradient-to-br from-[#231b0b] to-[#110e09] p-5">
                              <span className="font-mono text-[11px] text-amber-200 uppercase">
                                Medal Split
                              </span>
                              <div className="mt-3 flex items-baseline gap-3 font-mono text-lg font-extrabold">
                                <span className="text-[#fde047]">
                                  {wrappedData.first}G
                                </span>
                                <span className="text-slate-200">
                                  {wrappedData.second}S
                                </span>
                                <span className="text-[#f5c08D]">
                                  {wrappedData.third}B
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-neutral-400">
                                Gold · Silver · Bronze
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* SLIDE 1: SOVEREIGNS & TOP RATED */}
                      {wrappedSlide === 1 && (
                        <motion.div
                          key={`wrap-1-${wrappedYear}`}
                          initial={{ opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -24 }}
                          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-6"
                        >
                          <div>
                            <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#d4af37] uppercase">
                              Chapter 02 · Season Sovereigns &amp; Ratings
                            </span>
                            <h3 className="mt-1 font-display text-3xl font-bold text-white">
                              Who Owned {wrappedData.label}
                            </h3>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <button
                              type="button"
                              disabled={!wrappedData.pointsLeader}
                              onClick={() =>
                                wrappedData.pointsLeader &&
                                setSelectedCareerPlayer(
                                  wrappedData.pointsLeader.player
                                )
                              }
                              className="rounded-2xl border border-[#d4af37]/50 bg-gradient-to-br from-[#1f190b] to-[#0d0c09] p-5 text-left transition-colors hover:border-[#f8e6a0] cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[11px] font-bold text-[#d4af37] uppercase">
                                  Standings Sovereign
                                </span>
                                <Crown className="h-5 w-5 text-[#f5dc82]" />
                              </div>
                              <p className="mt-2 font-display text-2xl font-bold text-[#f8e6a0]">
                                {wrappedData.pointsLeader?.player || '—'}
                              </p>
                              <p className="mt-1 font-mono text-xs text-neutral-300">
                                {wrappedData.pointsLeader
                                  ? `${wrappedData.pointsLeader.points} pts · ${wrappedData.pointsLeader.totalQuizzes} quizzes · ${wrappedData.pointsLeader.first} Gold`
                                  : 'No data'}
                              </p>
                            </button>

                            <button
                              type="button"
                              disabled={!wrappedData.topRatedPlayer}
                              onClick={() =>
                                wrappedData.topRatedPlayer &&
                                setSelectedCareerPlayer(
                                  wrappedData.topRatedPlayer.player
                                )
                              }
                              className="rounded-2xl border border-sky-400/45 bg-gradient-to-br from-[#0e1e33] to-[#080d14] p-5 text-left transition-colors hover:border-sky-300 cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[11px] font-bold text-sky-300 uppercase">
                                  Highest Avg Player Rating
                                </span>
                                <Star className="h-5 w-5 text-sky-300" />
                              </div>
                              <p className="mt-2 font-display text-2xl font-bold text-white">
                                {wrappedData.topRatedPlayer?.player || '—'}
                              </p>
                              <p className="mt-1 font-mono text-xs text-sky-200">
                                {wrappedData.topRatedPlayer
                                  ? `${wrappedData.topRatedPlayer.avgRating} / 10 avg across ${wrappedData.topRatedPlayer.quizzes} quizzes`
                                  : 'No ratings'}
                              </p>
                            </button>

                            <button
                              type="button"
                              disabled={!wrappedData.goldSovereign}
                              onClick={() =>
                                wrappedData.goldSovereign &&
                                setSelectedCareerPlayer(
                                  wrappedData.goldSovereign.player
                                )
                              }
                              className="rounded-2xl border border-amber-300/35 bg-[#15120c] p-5 text-left transition-colors hover:border-amber-200 cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[11px] font-bold text-amber-300 uppercase">
                                  Most Gold Wins
                                </span>
                                <Trophy className="h-5 w-5 text-amber-300" />
                              </div>
                              <p className="mt-2 font-display text-xl font-bold text-white">
                                {wrappedData.goldSovereign?.player || 'None Yet'}
                              </p>
                              <p className="mt-1 font-mono text-xs text-neutral-300">
                                {wrappedData.goldSovereign
                                  ? `${wrappedData.goldSovereign.first} First Place Finishes`
                                  : 'No 1st place recorded'}
                              </p>
                            </button>

                            <button
                              type="button"
                              disabled={!wrappedData.clutchQualifier}
                              onClick={() =>
                                wrappedData.clutchQualifier &&
                                setSelectedCareerPlayer(
                                  wrappedData.clutchQualifier.player
                                )
                              }
                              className="rounded-2xl border border-emerald-400/35 bg-[#0b1814] p-5 text-left transition-colors hover:border-emerald-300 cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[11px] font-bold text-emerald-300 uppercase">
                                  Clutch Qualifier
                                </span>
                                <Award className="h-5 w-5 text-emerald-300" />
                              </div>
                              <p className="mt-2 font-display text-xl font-bold text-white">
                                {wrappedData.clutchQualifier?.player || 'None Yet'}
                              </p>
                              <p className="mt-1 font-mono text-xs text-emerald-200/85">
                                {wrappedData.clutchQualifier
                                  ? `${wrappedData.clutchQualifier.qualified} Finals Reached`
                                  : 'No qualifications recorded'}
                              </p>
                            </button>
                          </div>

                          {wrappedData.topRatedPlayers.length > 1 && (
                            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                              <p className="mb-3 font-mono text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                                Individual Rating Leaderboard
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                {wrappedData.topRatedPlayers.map((tp, i) => (
                                  <button
                                    key={tp.player}
                                    type="button"
                                    onClick={() =>
                                      setSelectedCareerPlayer(tp.player)
                                    }
                                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:border-[#d4af37]/50 cursor-pointer"
                                  >
                                    <span className="truncate text-xs font-semibold text-white">
                                      #{i + 1} {tp.player}
                                    </span>
                                    <span className="ml-2 shrink-0 font-mono text-xs font-bold text-[#f8e6a0]">
                                      {tp.avgRating}/10
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {/* SLIDE 2: UNSTOPPABLE DUO */}
                      {wrappedSlide === 2 && (
                        <motion.div
                          key={`wrap-2-${wrappedYear}`}
                          initial={{ opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -24 }}
                          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-6"
                        >
                          <div>
                            <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-emerald-300 uppercase">
                              Chapter 03 · Squad Chemistry
                            </span>
                            <h3 className="mt-1 font-display text-3xl font-bold text-white">
                              The Unstoppable Duo
                            </h3>
                          </div>

                          {wrappedData.topDuo ? (
                            <div className="rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-[#0c1d18] to-[#08100d] p-6">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="rounded-lg border border-emerald-400/35 bg-emerald-400/10 px-3 py-1 font-mono text-[11px] font-bold text-emerald-200 uppercase">
                                  #1 Synergy Pair · {wrappedData.label}
                                </span>
                                <span className="font-mono text-xs font-bold text-[#f8e6a0]">
                                  {wrappedData.topDuo.qualRate}% Shared Qualification
                                </span>
                              </div>
                              <p className="mt-4 font-display text-2xl font-bold text-white sm:text-3xl">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedCareerPlayer(
                                      wrappedData.topDuo!.playerA
                                    )
                                  }
                                  className="hover:text-[#f8e6a0] hover:underline cursor-pointer"
                                >
                                  {wrappedData.topDuo.playerA}
                                </button>
                                <span className="mx-2 text-[#d4af37]">&amp;</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedCareerPlayer(
                                      wrappedData.topDuo!.playerB
                                    )
                                  }
                                  className="hover:text-[#f8e6a0] hover:underline cursor-pointer"
                                >
                                  {wrappedData.topDuo.playerB}
                                </button>
                              </p>
                              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-xl border border-white/10 bg-black/35 p-3 text-center">
                                  <span className="block font-mono text-[10px] text-neutral-400 uppercase">
                                    Shared Quizzes
                                  </span>
                                  <span className="font-mono text-xl font-bold text-white">
                                    {wrappedData.topDuo.shared}
                                  </span>
                                </div>
                                <div className="rounded-xl border border-[#d4af37]/30 bg-black/35 p-3 text-center">
                                  <span className="block font-mono text-[10px] text-[#d4af37] uppercase">
                                    Gold Together
                                  </span>
                                  <span className="font-mono text-xl font-bold text-[#f8e6a0]">
                                    {wrappedData.topDuo.wins}
                                  </span>
                                </div>
                                <div className="rounded-xl border border-emerald-400/25 bg-black/35 p-3 text-center">
                                  <span className="block font-mono text-[10px] text-emerald-300 uppercase">
                                    Top-3 Podiums
                                  </span>
                                  <span className="font-mono text-xl font-bold text-emerald-200">
                                    {wrappedData.topDuo.podiums}
                                  </span>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-black/35 p-3 text-center">
                                  <span className="block font-mono text-[10px] text-neutral-400 uppercase">
                                    Duo Points
                                  </span>
                                  <span className="font-mono text-xl font-bold text-white">
                                    {wrappedData.topDuo.points}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-neutral-400">
                              No multi-player team combinations found in this scope.
                            </p>
                          )}

                          {wrappedData.runnerUpDuo && (
                            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-neutral-300">
                              <span className="font-mono font-bold text-[#d4af37] uppercase">
                                Runner-Up Duo:{' '}
                              </span>
                              <span className="font-semibold text-white">
                                {wrappedData.runnerUpDuo.playerA} &amp;{' '}
                                {wrappedData.runnerUpDuo.playerB}
                              </span>{' '}
                              · {wrappedData.runnerUpDuo.podiums} Podiums ·{' '}
                              {wrappedData.runnerUpDuo.wins} Gold
                            </div>
                          )}
                        </motion.div>
                      )}

                      {/* SLIDE 3: STREAKS & SIGNATURE MOMENT */}
                      {wrappedSlide === 3 && (
                        <motion.div
                          key={`wrap-3-${wrappedYear}`}
                          initial={{ opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -24 }}
                          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-6"
                        >
                          <div>
                            <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#d4af37] uppercase">
                              Chapter 04 · Momentum &amp; Signature Victory
                            </span>
                            <h3 className="mt-1 font-display text-3xl font-bold text-white">
                              Streaks &amp; Defining Stage
                            </h3>
                          </div>

                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-2xl border border-emerald-400/35 bg-[#0b1915] p-5">
                              <span className="font-mono text-[10px] font-bold text-emerald-300 uppercase">
                                Best Qualification Streak
                              </span>
                              <p className="mt-2 font-mono text-3xl font-extrabold text-white">
                                {wrappedData.bestQualStreak} Quizzes
                              </p>
                            </div>
                            <div className="rounded-2xl border border-[#d4af37]/35 bg-[#18140b] p-5">
                              <span className="font-mono text-[10px] font-bold text-[#f5dc82] uppercase">
                                Unbroken Podium Run
                              </span>
                              <p className="mt-2 font-mono text-3xl font-extrabold text-[#f8e6a0]">
                                {wrappedData.bestPodiumStreak} Top-3
                              </p>
                            </div>
                            <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
                              <span className="font-mono text-[10px] font-bold text-neutral-300 uppercase">
                                Top Host Arena
                              </span>
                              <p className="mt-2 truncate font-display text-xl font-bold text-white">
                                {wrappedData.topHost?.host || '—'}
                              </p>
                              <p className="mt-1 font-mono text-xs text-neutral-400">
                                {wrappedData.topHost
                                  ? `${wrappedData.topHost.total} visits · ${wrappedData.topHost.wins} Gold`
                                  : 'No host'}
                              </p>
                            </div>
                          </div>

                          {wrappedData.signatureQuiz && (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedQuiz(wrappedData.signatureQuiz)
                              }
                              className="block w-full rounded-2xl border border-[#d4af37]/50 bg-gradient-to-r from-[#1d1709] via-[#101c30] to-[#0a1322] p-6 text-left transition-colors hover:border-[#f8e6a0] cursor-pointer"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-mono text-[11px] font-bold tracking-wider text-[#f5dc82] uppercase">
                                  Signature Quiz Moment (Click to inspect)
                                </span>
                                <span className="font-mono text-xs font-bold text-[#fde047]">
                                  {wrappedData.signatureQuiz.rating}/10 Rating ·{' '}
                                  {wrappedData.signatureQuiz.teamCount} Teams
                                </span>
                              </div>
                              <h4 className="mt-2 font-display text-2xl font-bold text-white">
                                {wrappedData.signatureQuiz.quizName}
                              </h4>
                              <p className="mt-1 text-xs text-neutral-300">
                                {wrappedData.signatureQuiz.position === 'Not Qualified'
                                  ? 'Not Qualified'
                                  : `${wrappedData.signatureQuiz.position} Place`}{' '}
                                · {wrappedData.signatureQuiz.host} (
                                {wrappedData.signatureQuiz.yearBS} B.S.)
                              </p>
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {wrappedData.signatureQuiz.players.map((pl) => (
                                  <span
                                    key={pl}
                                    className="rounded-lg border border-[#d4af37]/30 bg-black/35 px-2.5 py-1 font-mono text-[11px] text-[#f5f2eb]"
                                  >
                                    {pl} ·{' '}
                                    <span className="font-bold text-[#f8e6a0]">
                                      {getPlayerQuizRating(
                                        wrappedData.signatureQuiz!,
                                        pl
                                      )}
                                      /10
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </button>
                          )}
                        </motion.div>
                      )}

                      {/* SLIDE 4: POSTER & EXPORT */}
                      {wrappedSlide === 4 && (
                        <motion.div
                          key={`wrap-4-${wrappedYear}`}
                          initial={{ opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -24 }}
                          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-6"
                        >
                          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                            <div>
                              <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#d4af37] uppercase">
                                Chapter 05 · Official Souvenir Poster
                              </span>
                              <h3 className="mt-1 font-display text-3xl font-bold text-[#f8e6a0]">
                                {wrappedData.label} Summary Card
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={downloadWrappedPoster}
                              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f0cb65] px-5 py-3 text-xs font-bold text-[#08080a] shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-transform hover:scale-[1.02] cursor-pointer"
                            >
                              <Download className="h-4 w-4" />
                              <span>Download Wrapped Poster (.png)</span>
                            </button>
                          </div>

                          <div className="rounded-2xl border-2 border-[#d4af37]/50 bg-gradient-to-br from-[#0e1b2f] via-[#0b0c10] to-[#171209] p-6 sm:p-8">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d4af37]/25 pb-4">
                              <div>
                                <p className="font-mono text-[10px] tracking-[0.22em] text-[#d4af37] uppercase">
                                  District Quiz Royale · Wrapped Archive
                                </p>
                                <p className="mt-1 font-display text-2xl font-bold text-white">
                                  {wrappedData.label}
                                </p>
                              </div>
                              <div className="flex gap-3 font-mono text-xs">
                                <span className="rounded-lg border border-[#d4af37]/35 bg-[#d4af37]/15 px-3 py-1.5 font-bold text-[#f8e6a0]">
                                  {wrappedData.first} Gold
                                </span>
                                <span className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 font-bold text-emerald-200">
                                  {wrappedData.qualRate}% Qual
                                </span>
                              </div>
                            </div>

                            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                              <div className="rounded-xl border border-white/10 bg-black/35 p-4">
                                <span className="font-mono text-[10px] text-neutral-400 uppercase">
                                  Points Sovereign
                                </span>
                                <p className="mt-1 font-display text-lg font-bold text-[#f8e6a0]">
                                  {wrappedData.pointsLeader?.player || '—'}
                                </p>
                                <p className="mt-0.5 font-mono text-[11px] text-neutral-300">
                                  {wrappedData.pointsLeader
                                    ? `${wrappedData.pointsLeader.points} pts`
                                    : '—'}
                                </p>
                              </div>

                              <div className="rounded-xl border border-white/10 bg-black/35 p-4">
                                <span className="font-mono text-[10px] text-sky-300 uppercase">
                                  Top Rated Player
                                </span>
                                <p className="mt-1 font-display text-lg font-bold text-white">
                                  {wrappedData.topRatedPlayer?.player || '—'}
                                </p>
                                <p className="mt-0.5 font-mono text-[11px] text-sky-200">
                                  {wrappedData.topRatedPlayer
                                    ? `${wrappedData.topRatedPlayer.avgRating}/10 Avg Rating`
                                    : '—'}
                                </p>
                              </div>

                              <div className="rounded-xl border border-white/10 bg-black/35 p-4">
                                <span className="font-mono text-[10px] text-emerald-300 uppercase">
                                  Unstoppable Duo
                                </span>
                                <p className="mt-1 font-display text-base font-bold text-white">
                                  {wrappedData.topDuo
                                    ? `${wrappedData.topDuo.playerA} & ${wrappedData.topDuo.playerB}`
                                    : '—'}
                                </p>
                                <p className="mt-0.5 font-mono text-[11px] text-emerald-200">
                                  {wrappedData.topDuo
                                    ? `${wrappedData.topDuo.podiums} Podiums`
                                    : '—'}
                                </p>
                              </div>

                              <div className="rounded-xl border border-white/10 bg-black/35 p-4">
                                <span className="font-mono text-[10px] text-amber-300 uppercase">
                                  Signature Quiz
                                </span>
                                <p className="mt-1 truncate font-display text-base font-bold text-white">
                                  {wrappedData.signatureQuiz?.quizName || '—'}
                                </p>
                                <p className="mt-0.5 font-mono text-[11px] text-neutral-300">
                                  {wrappedData.signatureQuiz
                                    ? `${wrappedData.signatureQuiz.position} · ${wrappedData.signatureQuiz.rating}/10`
                                    : '—'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* QUIZ DETAIL POP-UP MODAL */}
      <AnimatePresence>
        {selectedQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedQuiz(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#d4af37]/50 bg-[#08192f] p-6 text-white shadow-[0_28px_90px_rgba(0,0,0,0.75)] sm:p-8"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-4">
                  <PositionCrownOrEmblem
                    position={selectedQuiz.position}
                    className="h-14 w-14 shrink-0"
                  />
                  <div>
                    <p className="font-mono text-xs font-semibold text-[#f5dc82]">
                      {selectedQuiz.yearBS} B.S. ·{' '}
                      {selectedQuiz.position === 'Not Qualified'
                        ? 'Not Qualified'
                        : `${selectedQuiz.position} Place`}{' '}
                      ({POSITION_POINTS[selectedQuiz.position]} pts)
                    </p>
                    <h3 className="mt-1 font-display text-2xl font-bold text-white">
                      {selectedQuiz.quizName}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedQuiz(null)}
                  aria-label="Close quiz details"
                  className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-[#0b2340] p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#d4af37]">
                    <MapPin className="h-4 w-4" />
                    <span>Host / Organizer</span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-white">
                    {selectedQuiz.host}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0b2340] p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#d4af37]">
                    <Calendar className="h-4 w-4" />
                    <span>Year & Teams</span>
                  </div>
                  <p className="mt-1.5 font-mono text-sm font-semibold text-white">
                    {selectedQuiz.yearBS} B.S. · {selectedQuiz.teamCount} Teams
                    Competed
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0b2340] p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#d4af37]">
                    <Users className="h-4 w-4" />
                    <span>Participating Players &amp; Individual Ratings</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedQuiz.players.map((pl) => {
                      const pRating = getPlayerQuizRating(selectedQuiz, pl);
                      return (
                        <button
                          key={pl}
                          type="button"
                          onClick={() => {
                            setSelectedQuiz(null);
                            setSelectedCareerPlayer(pl.trim());
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4af37]/30 bg-[#08192f] px-2.5 py-1 text-xs font-medium text-[#f5f5f0] transition-colors hover:border-[#f0cb65] hover:text-[#f8e6a0] cursor-pointer"
                        >
                          <span>{pl}</span>
                          <span className="rounded bg-[#d4af37]/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#f8e6a0]">
                            {pRating}/10
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0b2340] p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#d4af37]">
                    <Star className="h-4 w-4" />
                    <span>Overall Performance Rating</span>
                  </div>
                  <p className="mt-1.5 font-mono text-sm font-bold text-[#f8e6a0]">
                    {selectedQuiz.rating} / 10
                  </p>
                  {selectedQuiz.players.length > 0 && (
                    <p className="mt-1 font-mono text-[11px] text-neutral-300">
                      Squad Avg:{' '}
                      {(
                        selectedQuiz.players.reduce(
                          (acc, pl) => acc + getPlayerQuizRating(selectedQuiz, pl),
                          0
                        ) / selectedQuiz.players.length
                      ).toFixed(1)}{' '}
                      / 10
                    </p>
                  )}
                </div>
              </div>

              {selectedQuiz.extraNote && (
                <div className="mt-5 rounded-xl border border-[#7c4d2b]/50 bg-[#f5f5f0] p-4 text-[#0a1f3a]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#7c4d2b] uppercase">
                    <Layers className="h-3.5 w-3.5" />
                    <span>Archivist Note</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed">
                    {selectedQuiz.extraNote}
                  </p>
                </div>
              )}

              {selectedQuiz.photos.length > 0 && (
                <div className="mt-6">
                  <p className="mb-3 font-mono text-xs font-semibold text-[#d4af37] uppercase">
                    Attached Photographs
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedQuiz.photos.map((url, pIdx) => (
                      <button
                        key={`${url}-${pIdx}`}
                        type="button"
                        onClick={() =>
                          setLightbox({
                            photos: selectedQuiz.photos.map((u) => ({
                              url: u,
                              title: selectedQuiz.quizName,
                              subtitle: `${selectedQuiz.yearBS} B.S. · ${selectedQuiz.host}`,
                            })),
                            index: pIdx,
                          })
                        }
                        className="group relative aspect-[4/3] overflow-hidden rounded-xl border-2 border-[#7c4d2b] cursor-pointer"
                      >
                        <img
                          src={url}
                          alt={`${selectedQuiz.quizName} photo ${pIdx + 1}`}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
                          <ZoomIn className="h-6 w-6 text-[#f8e6a0]" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN LIGHTBOX */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/92 p-4 backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close lightbox"
              className="absolute right-5 top-5 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>

            {lightbox.photos.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox((prev) =>
                      prev
                        ? {
                            ...prev,
                            index:
                              (prev.index - 1 + prev.photos.length) %
                              prev.photos.length,
                          }
                        : null
                    );
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 cursor-pointer"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox((prev) =>
                      prev
                        ? {
                            ...prev,
                            index: (prev.index + 1) % prev.photos.length,
                          }
                        : null
                    );
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 cursor-pointer"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <motion.div
              key={lightbox.index}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[88vh] max-w-4xl overflow-hidden rounded-2xl border border-[#d4af37]/30 bg-[#090d14] shadow-2xl"
            >
              <img
                src={lightbox.photos[lightbox.index].url}
                alt={lightbox.photos[lightbox.index].title}
                referrerPolicy="no-referrer"
                className="max-h-[72vh] w-full object-contain bg-black"
              />
              <div className="border-t border-white/10 p-4 text-center">
                <p className="font-display text-lg font-bold text-[#f8e6a0]">
                  {lightbox.photos[lightbox.index].title}
                </p>
                <p className="mt-1 text-xs text-neutral-300">
                  {lightbox.photos[lightbox.index].subtitle}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PLAYER CAREER PROFILE MODAL */}
      <AnimatePresence>
        {careerProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCareerPlayer(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#d4af37]/50 bg-[#081526] p-6 text-white shadow-[0_28px_90px_rgba(0,0,0,0.8)] sm:p-8"
            >
              {/* Career Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#d4af37]/50 bg-gradient-to-br from-[#2a1f0a] to-[#0d1a2d] shadow-inner">
                    <Crown className="h-7 w-7 text-[#f5dc82]" />
                  </div>
                  <div>
                    <p className="font-mono text-[11px] font-bold tracking-[0.18em] text-[#d4af37] uppercase">
                      District Quiz Career Dossier
                    </p>
                    <h3 className="mt-1 font-display text-2xl font-bold text-[#f8e6a0] sm:text-3xl">
                      {careerProfile.name}
                    </h3>
                    <p className="mt-1 font-mono text-xs text-neutral-300">
                      {careerProfile.activeYears.length > 0
                        ? `Active Seasons: ${careerProfile.activeYears.join(' · ')} B.S.`
                        : 'No recorded seasons'}
                      {careerProfile.totalQuizzes > 0
                        ? ` · Avg Rating: ${careerProfile.avgRating}/10`
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {uniquePlayers.length >= 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetName = careerProfile.name;
                        const other =
                          uniquePlayers.find(
                            (p) =>
                              p.toLowerCase() !== targetName.toLowerCase()
                          ) || targetName;
                        setH2hPlayerA(targetName);
                        if (
                          h2hPlayerB.toLowerCase() === targetName.toLowerCase()
                        ) {
                          setH2hPlayerB(other);
                        }
                        setSelectedCareerPlayer(null);
                        setSubTab('head-to-head');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#d4af37]/45 bg-[#d4af37]/15 px-3 py-2 text-xs font-semibold text-[#f8e6a0] transition-colors hover:bg-[#d4af37]/25 cursor-pointer"
                    >
                      <Swords className="h-3.5 w-3.5" />
                      <span>Compare Head-to-Head</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedCareerPlayer(null)}
                    aria-label="Close career profile"
                    className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* 4 Career Summary Tiles */}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-[#0c1d33] p-4">
                  <p className="font-mono text-[10px] tracking-wider text-neutral-400 uppercase">
                    Quizzes Played
                  </p>
                  <p className="mt-1.5 font-mono text-2xl font-bold text-white">
                    {careerProfile.totalQuizzes}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-400/25 bg-[#0b1f1c] p-4">
                  <p className="font-mono text-[10px] tracking-wider text-emerald-300 uppercase">
                    Qualifications
                  </p>
                  <p className="mt-1.5 font-mono text-2xl font-bold text-emerald-200">
                    {careerProfile.qualified}
                    <span className="ml-1.5 text-xs font-normal text-emerald-300/80">
                      ({careerProfile.qualRate}%)
                    </span>
                  </p>
                </div>
                <div className="rounded-2xl border border-[#d4af37]/30 bg-[#1a160a] p-4">
                  <p className="font-mono text-[10px] tracking-wider text-[#d4af37] uppercase">
                    Top-3 Podiums
                  </p>
                  <p className="mt-1.5 font-mono text-2xl font-bold text-[#f8e6a0]">
                    {careerProfile.podiums}
                    <span className="ml-1.5 text-xs font-normal text-[#f5dc82]/80">
                      ({careerProfile.podiumRate}%)
                    </span>
                  </p>
                </div>
                <div className="rounded-2xl border border-sky-400/35 bg-[#0e1b2e] p-4">
                  <p className="font-mono text-[10px] tracking-wider text-sky-300 uppercase">
                    Avg Player Rating
                  </p>
                  <p className="mt-1.5 font-mono text-2xl font-bold text-sky-100">
                    {careerProfile.avgRating}
                    <span className="ml-1 text-xs font-normal text-sky-300/80">
                      / 10
                    </span>
                  </p>
                </div>
              </div>

              {/* Placement Breakdown */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b192c] p-5">
                <p className="font-mono text-[11px] font-bold tracking-wider text-[#d4af37] uppercase">
                  Career Placement Breakdown
                </p>
                <div className="mt-3.5 grid grid-cols-4 gap-2.5 text-center font-mono text-xs sm:grid-cols-7">
                  {[
                    {
                      label: '1st',
                      val: careerProfile.first,
                      cls: 'border-[#d4af37]/50 bg-[#d4af37]/15 text-[#f8e6a0]',
                    },
                    {
                      label: '2nd',
                      val: careerProfile.second,
                      cls: 'border-slate-300/35 bg-slate-300/10 text-slate-100',
                    },
                    {
                      label: '3rd',
                      val: careerProfile.third,
                      cls: 'border-[#b86b35]/45 bg-[#b86b35]/15 text-[#f5c08D]',
                    },
                    {
                      label: '4th',
                      val: careerProfile.fourth,
                      cls: 'border-white/15 bg-white/5 text-neutral-200',
                    },
                    {
                      label: '5th',
                      val: careerProfile.fifth,
                      cls: 'border-white/15 bg-white/5 text-neutral-200',
                    },
                    {
                      label: '6th',
                      val: careerProfile.sixth,
                      cls: 'border-white/15 bg-white/5 text-neutral-200',
                    },
                    {
                      label: 'NQ',
                      val: careerProfile.notQualified,
                      cls: 'border-rose-400/20 bg-rose-500/10 text-rose-200',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-xl border py-2.5 ${item.cls}`}
                    >
                      <span className="block text-[10px] opacity-80">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-base font-bold">
                        {item.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Best Partner & Strongest Host */}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-400/25 bg-[#0a1815] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                    <Users className="h-4 w-4" />
                    <span>Best Teammate Chemistry</span>
                  </div>
                  {careerProfile.bestPartner ? (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCareerPlayer(
                            careerProfile.bestPartner!.name
                          )
                        }
                        className="font-display text-lg font-bold text-white hover:text-[#f8e6a0] hover:underline cursor-pointer"
                      >
                        {careerProfile.bestPartner.name}
                      </button>
                      <p className="mt-0.5 font-mono text-xs text-neutral-300">
                        {careerProfile.bestPartner.shared} Shared Quizzes ·{' '}
                        {careerProfile.bestPartner.podiums} Podiums ·{' '}
                        {careerProfile.bestPartner.wins} Gold
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-neutral-400">
                      No teammate records yet.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-[#d4af37]/25 bg-[#121622] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#f5dc82]">
                    <MapPin className="h-4 w-4" />
                    <span>Strongest Host / Organizer</span>
                  </div>
                  {careerProfile.topHost ? (
                    <div className="mt-2">
                      <p className="truncate font-display text-lg font-bold text-white">
                        {careerProfile.topHost.host}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-neutral-300">
                        {careerProfile.topHost.total} Appearances ·{' '}
                        {careerProfile.topHost.podiums} Podiums ·{' '}
                        {careerProfile.topHost.wins} Gold
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-neutral-400">
                      No host data yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Chronological Quiz History */}
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-mono text-[11px] font-bold tracking-wider text-[#d4af37] uppercase">
                    Competition Timeline ({careerProfile.quizzes.length})
                  </p>
                  <span className="text-[11px] text-neutral-400">
                    Click any quiz to inspect
                  </span>
                </div>

                <div className="space-y-2.5">
                  {careerProfile.quizzes.map((qz) => (
                    <button
                      key={qz.id}
                      type="button"
                      onClick={() => {
                        setSelectedCareerPlayer(null);
                        setSelectedQuiz(qz);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0c1d33] p-3.5 text-left transition-colors hover:border-[#d4af37]/55 hover:bg-[#112745] cursor-pointer"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <PositionCrownOrEmblem
                          position={qz.position}
                          className="h-9 w-9 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-bold text-white">
                            {qz.quizName}
                          </p>
                          <p className="mt-0.5 truncate font-mono text-[11px] text-neutral-300">
                            {qz.yearBS} B.S. · {qz.host}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-lg border border-sky-400/30 bg-sky-500/10 px-2 py-1 font-mono text-[11px] font-bold text-sky-200">
                          {getPlayerQuizRating(qz, careerProfile.name)}/10
                        </span>
                        <span
                          className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold ${
                            qz.position === '1st'
                              ? 'border-[#d4af37]/50 bg-[#d4af37]/15 text-[#f8e6a0]'
                              : qz.position === '2nd'
                                ? 'border-slate-300/40 bg-slate-300/10 text-slate-200'
                                : qz.position === '3rd'
                                  ? 'border-[#b86b35]/50 bg-[#b86b35]/15 text-[#f5c08D]'
                                  : qz.position === 'Not Qualified'
                                    ? 'border-white/15 bg-white/5 text-neutral-400'
                                    : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                          }`}
                        >
                          {qz.position === 'Not Qualified'
                            ? 'NQ'
                            : qz.position}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
