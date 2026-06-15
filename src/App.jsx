import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ClipboardList,
  Clock3,
  Download,
  Dumbbell,
  Flag,
  History,
  Plus,
  RotateCcw,
  Search,
  Shuffle,
  TimerReset,
  Trophy,
  Upload,
  UserRound,
  X,
} from 'lucide-react';

const STORAGE_KEY = 'canelift.state.v1';
const fieldBackground = `${import.meta.env.BASE_URL}assets/miami-field.svg`;

const catalogSeed = [
  ['bench-press', 'Bench Press', 'Chest', 4, [[135, 10], [155, 8], [185, 8], [185, 6]]],
  ['incline-db-press', 'Incline DB Press', 'Chest', 4, [[75, 10], [85, 10], [100, 10], [100, 8]]],
  ['machine-shoulder-press', 'Machine Shoulder Press', 'Shoulders', 4, [[95, 12], [115, 10], [135, 8], [135, 8]]],
  ['lateral-raises', 'Lateral Raises', 'Shoulders', 3, [[20, 15], [25, 15], [25, 12]]],
  ['tricep-pushdown', 'Tricep Pushdown', 'Triceps', 3, [[80, 12], [95, 12], [95, 10]]],
  ['chest-fly', 'Chest Fly', 'Chest', 3, [[70, 12], [80, 12], [80, 10]]],
  ['dips', 'Dips', 'Chest', 3, [[0, 10], [0, 10], [0, 8]]],
  ['back-squat', 'Back Squat', 'Legs', 4, [[185, 8], [225, 6], [245, 5], [245, 5]]],
  ['romanian-deadlift', 'Romanian Deadlift', 'Hamstrings', 3, [[185, 10], [205, 8], [205, 8]]],
  ['leg-press', 'Leg Press', 'Legs', 4, [[360, 12], [450, 12], [500, 10], [500, 10]]],
  ['lat-pulldown', 'Lat Pulldown', 'Back', 4, [[120, 12], [140, 10], [150, 10], [150, 8]]],
  ['seated-cable-row', 'Seated Cable Row', 'Back', 4, [[120, 12], [135, 10], [145, 10], [145, 8]]],
  ['barbell-curl', 'Barbell Curl', 'Biceps', 3, [[60, 12], [70, 10], [70, 8]]],
].map(([id, name, muscle, defaultSets, starter]) => ({
  id,
  name,
  muscle,
  defaultSets,
  starter: starter.map(([weight, reps]) => ({ weight, reps })),
}));

const routineSeed = [
  {
    id: 'push-hypertrophy',
    name: 'Push Hypertrophy',
    focus: 'Chest, shoulders, triceps',
    exercises: ['bench-press', 'incline-db-press', 'machine-shoulder-press', 'lateral-raises', 'tricep-pushdown', 'chest-fly', 'dips'],
  },
  {
    id: 'leg-growth',
    name: 'Leg Growth',
    focus: 'Quads, glutes, hamstrings',
    exercises: ['back-squat', 'romanian-deadlift', 'leg-press', 'lateral-raises'],
  },
  {
    id: 'pull-strength',
    name: 'Pull Strength',
    focus: 'Back, rear delts, biceps',
    exercises: ['lat-pulldown', 'seated-cable-row', 'barbell-curl', 'romanian-deadlift'],
  },
].map((routine) => ({
  ...routine,
  exercises: routine.exercises.map((exerciseId) => ({
    exerciseId,
    targetSets: catalogSeed.find((exercise) => exercise.id === exerciseId)?.defaultSets || 3,
  })),
}));

const sampleHistory = [
  {
    id: 'sample-push',
    routineId: 'push-hypertrophy',
    routineName: 'Push Hypertrophy',
    startedAt: '2026-06-11T20:03:00.000Z',
    endedAt: '2026-06-11T21:04:15.000Z',
    durationSeconds: 3675,
    exercises: routineSeed[0].exercises.map((item, index) => {
      const exercise = catalogSeed.find((candidate) => candidate.id === item.exerciseId);
      return {
        instanceId: `sample-${item.exerciseId}-${index}`,
        exerciseId: item.exerciseId,
        name: exercise.name,
        targetSets: item.targetSets,
        sets: exercise.starter.slice(0, item.targetSets).map((set, setIndex) => ({
          id: `sample-set-${item.exerciseId}-${setIndex}`,
          weight: set.weight,
          reps: set.reps,
          done: true,
        })),
      };
    }),
  },
];

const defaultState = () => ({
  catalog: catalogSeed,
  routines: routineSeed,
  history: sampleHistory,
  activeWorkout: null,
});

const uid = (prefix) => `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
const slug = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const formatWeight = (weight) => (Number(weight) ? `${Number(weight)} lb` : 'BW');
const formatElapsed = (seconds) => {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remaining = safe % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}` : `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
};
const formatDate = (iso) =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored?.catalog && stored?.routines && stored?.history ? { ...defaultState(), ...stored } : defaultState();
  } catch {
    return defaultState();
  }
}

function bestSet(sets) {
  return sets
    .filter((set) => set.done && Number(set.reps) > 0)
    .sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0) || (Number(b.reps) || 0) - (Number(a.reps) || 0))[0];
}

function lastPerformance(history) {
  const map = {};
  [...history]
    .sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt))
    .forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        if (map[exercise.exerciseId]) return;
        const best = bestSet(exercise.sets);
        if (!best) return;
        map[exercise.exerciseId] = {
          weight: Number(best.weight) || 0,
          reps: Number(best.reps) || 0,
          sets: exercise.sets.filter((set) => set.done).map((set) => ({ weight: Number(set.weight) || 0, reps: Number(set.reps) || 0 })),
        };
      });
    });
  return map;
}

function volume(workout) {
  return (
    workout?.exercises.reduce(
      (total, exercise) => total + exercise.sets.reduce((sum, set) => sum + (set.done ? (Number(set.weight) || 0) * (Number(set.reps) || 0) : 0), 0),
      0,
    ) || 0
  );
}

function makeExercise(template, catalog, lastMap) {
  const exercise = catalog.find((item) => item.id === template.exerciseId) || catalog[0];
  const targetSets = Number(template.targetSets) || exercise.defaultSets || 3;
  const source = lastMap[exercise.id]?.sets?.length ? lastMap[exercise.id].sets : exercise.starter;
  return {
    instanceId: uid('exercise'),
    exerciseId: exercise.id,
    name: exercise.name,
    muscle: exercise.muscle,
    targetSets,
    sets: Array.from({ length: targetSets }, (_, index) => {
      const set = source[index] || source[source.length - 1] || { weight: '', reps: '' };
      return { id: uid('set'), weight: set.weight, reps: set.reps, done: false };
    }),
  };
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [tab, setTab] = useState('workout');
  const [replaceIndex, setReplaceIndex] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [now, setNow] = useState(Date.now());
  const lastMap = useMemo(() => lastPerformance(state.history), [state.history]);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsed = state.activeWorkout ? Math.max(0, Math.floor((now - new Date(state.activeWorkout.startedAt)) / 1000)) : 0;

  const updateWorkout = (updater) => {
    setState((current) => ({
      ...current,
      activeWorkout: typeof updater === 'function' ? updater(current.activeWorkout, current) : updater,
    }));
  };

  const startWorkout = (routineId) => {
    setState((current) => {
      const routine = current.routines.find((item) => item.id === routineId) || current.routines[0];
      const workout = {
        id: uid('workout'),
        routineId: routine.id,
        routineName: routine.name,
        startedAt: new Date().toISOString(),
        exercises: routine.exercises.map((item) => makeExercise(item, current.catalog, lastPerformance(current.history))),
      };
      setExpanded(workout.exercises[0]?.instanceId || null);
      return { ...current, activeWorkout: workout };
    });
    setTab('workout');
  };

  const finishWorkout = () => {
    setState((current) => {
      if (!current.activeWorkout) return current;
      const endedAt = new Date().toISOString();
      const durationSeconds = Math.max(1, Math.floor((new Date(endedAt) - new Date(current.activeWorkout.startedAt)) / 1000));
      return {
        ...current,
        activeWorkout: null,
        history: [{ ...current.activeWorkout, endedAt, durationSeconds }, ...current.history].slice(0, 120),
      };
    });
    setTab('history');
  };

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    updateWorkout((workout) => ({
      ...workout,
      exercises: workout.exercises.map((exercise, index) =>
        index === exerciseIndex
          ? { ...exercise, sets: exercise.sets.map((set, inner) => (inner === setIndex ? { ...set, [field]: value } : set)) }
          : exercise,
      ),
    }));
  };

  const toggleSet = (exerciseIndex, setIndex) => {
    updateWorkout((workout) => ({
      ...workout,
      exercises: workout.exercises.map((exercise, index) =>
        index === exerciseIndex
          ? { ...exercise, sets: exercise.sets.map((set, inner) => (inner === setIndex ? { ...set, done: !set.done } : set)) }
          : exercise,
      ),
    }));
  };

  const moveExercise = (index, direction) => {
    updateWorkout((workout) => {
      const next = index + direction;
      if (next < 0 || next >= workout.exercises.length) return workout;
      const exercises = [...workout.exercises];
      [exercises[index], exercises[next]] = [exercises[next], exercises[index]];
      return { ...workout, exercises };
    });
  };

  const replaceExercise = (exerciseId) => {
    setState((current) => {
      if (replaceIndex === null || !current.activeWorkout) return current;
      const currentExercise = current.activeWorkout.exercises[replaceIndex];
      const replacement = makeExercise({ exerciseId, targetSets: currentExercise.sets.length }, current.catalog, lastPerformance(current.history));
      setExpanded(replacement.instanceId);
      return {
        ...current,
        activeWorkout: {
          ...current.activeWorkout,
          exercises: current.activeWorkout.exercises.map((exercise, index) => (index === replaceIndex ? replacement : exercise)),
        },
      };
    });
    setReplaceIndex(null);
  };

  const createExercise = (name) => {
    const cleanName = name.trim();
    if (!cleanName) return null;
    const exercise = {
      id: `custom-${slug(cleanName)}-${Date.now()}`,
      name: cleanName,
      muscle: 'Custom',
      defaultSets: 3,
      starter: [{ weight: '', reps: 10 }, { weight: '', reps: 10 }, { weight: '', reps: 8 }],
    };
    setState((current) => ({ ...current, catalog: [...current.catalog, exercise] }));
    return exercise;
  };

  return (
    <div className="app-page" style={{ '--field-bg': `url(${fieldBackground})` }}>
      <main className="phone-shell">
        <div className="content">
          {tab === 'workout' && (
            <WorkoutView
              state={state}
              lastMap={lastMap}
              elapsed={elapsed}
              expanded={expanded}
              setExpanded={setExpanded}
              startWorkout={startWorkout}
              finishWorkout={finishWorkout}
              updateSet={updateSet}
              toggleSet={toggleSet}
              moveExercise={moveExercise}
              setReplaceIndex={setReplaceIndex}
            />
          )}
          {tab === 'routines' && <RoutinesView state={state} setState={setState} startWorkout={startWorkout} createExercise={createExercise} />}
          {tab === 'history' && <HistoryView history={state.history} />}
          {tab === 'profile' && <ProfileView state={state} setState={setState} />}
        </div>
        <BottomNav tab={tab} setTab={setTab} />
      </main>
      <ReplaceSheet
        open={replaceIndex !== null}
        currentName={replaceIndex !== null ? state.activeWorkout?.exercises[replaceIndex]?.name : ''}
        catalog={state.catalog}
        onClose={() => setReplaceIndex(null)}
        onReplace={replaceExercise}
        onCreate={(name) => {
          const exercise = createExercise(name);
          if (exercise) replaceExercise(exercise.id);
        }}
      />
    </div>
  );
}

function WorkoutView({ state, lastMap, elapsed, expanded, setExpanded, startWorkout, finishWorkout, updateSet, toggleSet, moveExercise, setReplaceIndex }) {
  const workout = state.activeWorkout;
  if (!workout) {
    return (
      <section className="workout-view">
        <Brand />
        <div className="start-panel">
          <div className="timer idle">
            <strong>00:00</strong>
            <span><Clock3 size={15} /> Ready</span>
          </div>
          <h2>Choose today&apos;s routine</h2>
          <div className="routine-start-list">
            {state.routines.map((routine) => (
              <button className="routine-card" key={routine.id} type="button" onClick={() => startWorkout(routine.id)}>
                <span>{routine.name}</span>
                <small>{routine.focus || `${routine.exercises.length} exercises`}</small>
                <Flag size={20} />
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const doneSets = workout.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.done).length, 0);
  const targetSets = workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  const doneExercises = workout.exercises.filter((exercise) => exercise.sets.some((set) => set.done)).length;

  return (
    <section className="workout-view">
      <Brand />
      <div className="routine-banner">
        <ClipboardList size={23} />
        <div>
          <strong>{workout.routineName}</strong>
          <span>Live workout</span>
        </div>
      </div>
      <div className="timer">
        <strong>{formatElapsed(elapsed)}</strong>
        <span><Clock3 size={15} /> Elapsed time</span>
      </div>
      <div className="metrics">
        <Metric icon={<Trophy size={20} />} value={`${doneExercises} / ${workout.exercises.length}`} label="Exercises" />
        <Metric icon={<TimerReset size={20} />} value={`${doneSets} / ${targetSets}`} label="Sets" />
        <Metric icon={<Dumbbell size={20} />} value={`${volume(workout).toLocaleString()} lb`} label="Volume" />
      </div>
      <div className="exercise-stack">
        {workout.exercises.map((exercise, exerciseIndex) => {
          const isExpanded = expanded === exercise.instanceId;
          const last = lastMap[exercise.exerciseId];
          return (
            <article className={`exercise-row ${isExpanded ? 'expanded' : ''}`} key={exercise.instanceId}>
              <div className="exercise-top">
                <button className="order" type="button" onClick={() => setExpanded(isExpanded ? null : exercise.instanceId)}>{exerciseIndex + 1}</button>
                <button className="exercise-title" type="button" onClick={() => setExpanded(isExpanded ? null : exercise.instanceId)}>
                  <strong>{exercise.name}</strong>
                  <span>{last ? `Last: ${formatWeight(last.weight)} x ${last.reps}` : 'Last: no history'}</span>
                </button>
                <div className="set-pill"><Check size={15} /> {exercise.sets.filter((set) => set.done).length} / {exercise.sets.length}</div>
              </div>
              <div className="row-tools">
                <button type="button" aria-label="Move exercise up" onClick={() => moveExercise(exerciseIndex, -1)} disabled={exerciseIndex === 0}><ArrowUp size={17} /></button>
                <button type="button" aria-label="Move exercise down" onClick={() => moveExercise(exerciseIndex, 1)} disabled={exerciseIndex === workout.exercises.length - 1}><ArrowDown size={17} /></button>
                <button className="replace-button" type="button" onClick={() => setReplaceIndex(exerciseIndex)}><Shuffle size={16} /> Replace</button>
              </div>
              {isExpanded && (
                <div className="set-grid">
                  <span>Set</span><span>Weight</span><span>Reps</span><span>Done</span>
                  {exercise.sets.map((set, setIndex) => (
                    <SetRow
                      key={set.id}
                      set={set}
                      setIndex={setIndex}
                      onUpdate={(field, value) => updateSet(exerciseIndex, setIndex, field, value)}
                      onToggle={() => toggleSet(exerciseIndex, setIndex)}
                    />
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
      <button className="finish-button" type="button" onClick={finishWorkout}><Flag size={22} /> Finish workout</button>
    </section>
  );
}

function SetRow({ set, setIndex, onUpdate, onToggle }) {
  return (
    <>
      <strong className="set-number">{setIndex + 1}</strong>
      <label className="set-input">
        <input aria-label={`Set ${setIndex + 1} weight`} inputMode="decimal" value={set.weight} onChange={(event) => onUpdate('weight', event.target.value)} />
        <span>lb</span>
      </label>
      <label className="set-input">
        <input aria-label={`Set ${setIndex + 1} reps`} inputMode="numeric" value={set.reps} onChange={(event) => onUpdate('reps', event.target.value)} />
      </label>
      <button className={`done ${set.done ? 'checked' : ''}`} type="button" aria-label={`Mark set ${setIndex + 1} done`} onClick={onToggle}><Check size={17} /></button>
    </>
  );
}

function RoutinesView({ state, setState, startWorkout, createExercise }) {
  const [selectedId, setSelectedId] = useState(state.routines[0]?.id || '');
  const [newRoutine, setNewRoutine] = useState('');
  const [newExercise, setNewExercise] = useState('');
  const [exerciseId, setExerciseId] = useState(state.catalog[0]?.id || '');
  const routine = state.routines.find((item) => item.id === selectedId) || state.routines[0];

  const updateRoutine = (updater) => {
    setState((current) => ({ ...current, routines: current.routines.map((item) => (item.id === routine.id ? updater(item) : item)) }));
  };

  const moveTemplate = (index, direction) => {
    updateRoutine((current) => {
      const next = index + direction;
      if (next < 0 || next >= current.exercises.length) return current;
      const exercises = [...current.exercises];
      [exercises[index], exercises[next]] = [exercises[next], exercises[index]];
      return { ...current, exercises };
    });
  };

  return (
    <section className="panel-view">
      <PanelTitle label="Templates" title="Routines" icon={<ClipboardList size={28} />} />
      <div className="routine-tabs">
        {state.routines.map((item) => <button className={item.id === routine.id ? 'active' : ''} key={item.id} type="button" onClick={() => setSelectedId(item.id)}>{item.name}</button>)}
      </div>
      <button className="orange-button" type="button" onClick={() => startWorkout(routine.id)}><Flag size={18} /> Start {routine.name}</button>
      <div className="template-list">
        {routine.exercises.map((template, index) => {
          const exercise = state.catalog.find((item) => item.id === template.exerciseId);
          return (
            <div className="template-row" key={`${template.exerciseId}-${index}`}>
              <strong>{index + 1}</strong>
              <div><span>{exercise?.name}</span><small>{exercise?.muscle}</small></div>
              <input inputMode="numeric" value={template.targetSets} onChange={(event) => updateRoutine((current) => ({ ...current, exercises: current.exercises.map((item, inner) => inner === index ? { ...item, targetSets: Math.max(1, Number(event.target.value) || 1) } : item) }))} />
              <button type="button" onClick={() => moveTemplate(index, -1)}><ArrowUp size={16} /></button>
              <button type="button" onClick={() => moveTemplate(index, 1)}><ArrowDown size={16} /></button>
              <button type="button" onClick={() => updateRoutine((current) => ({ ...current, exercises: current.exercises.filter((_, inner) => inner !== index) }))}><X size={16} /></button>
            </div>
          );
        })}
      </div>
      <form className="inline-form" onSubmit={(event) => { event.preventDefault(); updateRoutine((current) => ({ ...current, exercises: [...current.exercises, { exerciseId, targetSets: 3 }] })); }}>
        <select value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}>{state.catalog.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select>
        <button type="submit"><Plus size={17} /> Add</button>
      </form>
      <form className="inline-form" onSubmit={(event) => { event.preventDefault(); const created = createExercise(newExercise); if (created) { setExerciseId(created.id); setNewExercise(''); } }}>
        <input value={newExercise} onChange={(event) => setNewExercise(event.target.value)} placeholder="New exercise" />
        <button type="submit"><Plus size={17} /> Create</button>
      </form>
      <form className="inline-form" onSubmit={(event) => {
        event.preventDefault();
        if (!newRoutine.trim()) return;
        const routine = { id: `routine-${slug(newRoutine)}-${Date.now()}`, name: newRoutine.trim(), focus: 'Custom routine', exercises: [] };
        setState((current) => ({ ...current, routines: [...current.routines, routine] }));
        setSelectedId(routine.id);
        setNewRoutine('');
      }}>
        <input value={newRoutine} onChange={(event) => setNewRoutine(event.target.value)} placeholder="New routine" />
        <button type="submit"><Plus size={17} /> Routine</button>
      </form>
    </section>
  );
}

function HistoryView({ history }) {
  return (
    <section className="panel-view">
      <PanelTitle label="Saved sessions" title="History" icon={<History size={28} />} />
      {history.map((workout) => (
        <article className="history-card" key={workout.id}>
          <div className="history-head">
            <div><strong>{workout.routineName}</strong><span>{formatDate(workout.endedAt)}</span></div>
            <em>{formatElapsed(workout.durationSeconds)}</em>
          </div>
          <div className="history-stats"><span>{volume(workout).toLocaleString()} lb</span><span>{workout.exercises.length} exercises</span></div>
          {workout.exercises.slice(0, 5).map((exercise) => {
            const best = bestSet(exercise.sets);
            return <div className="history-line" key={exercise.instanceId}><span>{exercise.name}</span><strong>{best ? `${formatWeight(best.weight)} x ${best.reps}` : 'No sets'}</strong></div>;
          })}
        </article>
      ))}
    </section>
  );
}

function ProfileView({ state, setState }) {
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `canelift-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (imported.catalog && imported.routines && imported.history) setState({ ...defaultState(), ...imported });
      } catch {
        return null;
      }
    };
    reader.readAsText(file);
  };

  return (
    <section className="panel-view">
      <PanelTitle label="Progress" title="Profile" icon={<UserRound size={28} />} />
      <div className="profile-grid">
        <Stat value={state.history.length} label="Workouts" />
        <Stat value={state.routines.length} label="Routines" />
        <Stat value={state.catalog.length} label="Exercises" />
        <Stat value={`${state.history.reduce((sum, workout) => sum + volume(workout), 0).toLocaleString()} lb`} label="Total volume" />
      </div>
      <div className="profile-actions">
        <button className="green-button" type="button" onClick={exportData}><Download size={18} /> Export</button>
        <label className="orange-button"><Upload size={18} /> Import<input type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && importData(event.target.files[0])} /></label>
        <button className="danger-button" type="button" onClick={() => setState(defaultState())}><RotateCcw size={18} /> Reset</button>
      </div>
    </section>
  );
}

function ReplaceSheet({ open, currentName, catalog, onClose, onReplace, onCreate }) {
  const [query, setQuery] = useState('');
  const [customName, setCustomName] = useState('');
  const matches = catalog.filter((exercise) => `${exercise.name} ${exercise.muscle}`.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="replace-sheet" role="dialog" aria-modal="true" aria-label="Replace exercise" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-header"><div><span>Replace</span><h2>{currentName}</h2></div><button type="button" onClick={onClose}><X size={20} /></button></div>
        <label className="search-field"><Search size={18} /><input placeholder="Search exercise" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <div className="replace-options">
          {matches.map((exercise) => <button key={exercise.id} type="button" onClick={() => onReplace(exercise.id)}><strong>{exercise.name}</strong><span>{exercise.muscle}</span></button>)}
        </div>
        <form className="inline-form dark" onSubmit={(event) => { event.preventDefault(); onCreate(customName); setCustomName(''); }}>
          <input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="New exercise name" />
          <button type="submit"><Plus size={17} /> Use</button>
        </form>
      </section>
    </div>
  );
}

function Brand() {
  return <div className="brand"><div><Dumbbell size={20} /></div><h1><span>Cane</span>Lift</h1></div>;
}

function Metric({ icon, value, label }) {
  return <div className="metric">{icon}<div><strong>{value}</strong><span>{label}</span></div></div>;
}

function PanelTitle({ label, title, icon }) {
  return <div className="panel-title"><div><span>{label}</span><h2>{title}</h2></div>{icon}</div>;
}

function Stat({ value, label }) {
  return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;
}

function BottomNav({ tab, setTab }) {
  const tabs = [
    ['history', 'History', History],
    ['routines', 'Routines', ClipboardList],
    ['workout', 'Workout', Dumbbell],
    ['profile', 'Profile', UserRound],
  ];
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {tabs.map(([id, label, Icon]) => (
        <button className={tab === id ? 'active' : ''} key={id} type="button" aria-label={label} onClick={() => setTab(id)}>
          <Icon size={24} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
