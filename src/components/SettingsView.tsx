import React, { useState, useEffect } from 'react';
import { ExerciseService } from '../services/exerciseService';
import { UserService } from '../services/userService';
import { WorkoutService } from '../services/workoutService';
import { auth } from '../services/firebase';
import { EXERCISE_CATEGORIES } from '../data/exercises';
import type { Exercise, WorkoutTemplate } from '../types';
import { Plus, Trash2, ChevronDown, ChevronUp, ChevronLeft, Settings, X, Edit2 } from 'lucide-react';
import { ExerciseSelector } from './ExerciseSelector';
import { ExerciseCard } from './ExerciseCard';
import { useNotification } from '../context/NotificationContext';

interface SettingsViewProps {
    onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
    const [loading, setLoading] = useState(true);
    const { showToast, confirm } = useNotification();

    // Preferences
    const [restTimerEnabled, setRestTimerEnabled] = useState(false);
    const [prefillPreviousWorkout, setPrefillPreviousWorkout] = useState(false);

    // Custom exercises
    const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newExName, setNewExName] = useState('');
    const [newExCategory, setNewExCategory] = useState('Strength');
    const [newExFields, setNewExFields] = useState<string[]>(['sets', 'reps', 'weight']);
    const [customSectionOpen, setCustomSectionOpen] = useState(false);

    const AVAILABLE_FIELDS = [
        { id: 'sets', label: 'Sets' },
        { id: 'reps', label: 'Reps' },
        { id: 'weight', label: 'Weight (kg)' },
        { id: 'duration', label: 'Duration (mins)' },
        { id: 'distance', label: 'Distance (km)' }
    ];

    // Templates
    const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
    const [templatesSectionOpen, setTemplatesSectionOpen] = useState(false);

    // Template editor state
    const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
    const [templateNameDraft, setTemplateNameDraft] = useState('');
    const [templateExercisesDraft, setTemplateExercisesDraft] = useState<any[]>([]);
    const [isSelectorOpenForTemplates, setIsSelectorOpenForTemplates] = useState(false);
    const [templateSaving, setTemplateSaving] = useState(false);

    // Local exercise catalog map (name -> exercise config)
    const [allExercisesMap, setAllExercisesMap] = useState<Record<string, any>>({});

    const categories = EXERCISE_CATEGORIES;

    const handleFieldToggle = (fieldId: string) => {
        setNewExFields(prev =>
            prev.includes(fieldId)
                ? prev.filter(f => f !== fieldId)
                : [...prev, fieldId]
        );
    };

    useEffect(() => {
        const loadData = async () => {
            if (!auth.currentUser) return;
            const userId = auth.currentUser.uid;
            try {
                const [custom, profile, templateDocs] = await Promise.all([
                    ExerciseService.getCustomExercises(userId),
                    UserService.getProfile(userId),
                    WorkoutService.getTemplates(userId)
                ]);
                if (profile?.restTimerEnabled !== undefined) setRestTimerEnabled(profile.restTimerEnabled);
                if (profile?.prefillPreviousWorkout !== undefined) setPrefillPreviousWorkout(profile.prefillPreviousWorkout);
                setCustomExercises(custom);
                setTemplates(templateDocs);
            } catch (error) {
                console.error('Error loading settings:', error);
                showToast('Failed to load settings', 'error');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Load exercise catalog map for appropriate exercise field configuration in the template editor
    useEffect(() => {
        const loadExercises = async () => {
            if (!auth.currentUser) return;
            try {
                const all = await ExerciseService.getAllExercises(auth.currentUser.uid);
                const map: Record<string, any> = {};
                for (const e of all) map[e.name] = e;
                setAllExercisesMap(map);
            } catch (err) {
                console.error('Failed to load exercise catalog for settings:', err);
            }
        };
        loadExercises();
    }, []);

    const handleAddCustom = async () => {
        if (!auth.currentUser || !newExName.trim() || newExFields.length === 0) {
            if (newExFields.length === 0) showToast('Please select at least one parameter', 'warning');
            return;
        }
        try {
            const id = await ExerciseService.addCustomExercise(auth.currentUser.uid, {
                name: newExName.trim(),
                category: newExCategory,
                fields: newExFields,
                isCustom: true
            });
            setCustomExercises(prev => [...prev, { id, name: newExName.trim(), category: newExCategory, fields: newExFields, isCustom: true }]);
            setNewExName('');
            setNewExFields(['sets', 'reps', 'weight']);
            setShowAddForm(false);
            showToast('Custom exercise added!', 'success');
        } catch (error) {
            showToast('Failed to add exercise', 'error');
        }
    };

    const handleDeleteCustom = async (exerciseId: string, name: string) => {
        if (!auth.currentUser) return;
        const confirmed = await confirm({
            title: 'Delete custom exercise',
            message: `Are you sure you want to delete "${name}"? This cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Keep'
        });
        if (!confirmed) return;
        try {
            await ExerciseService.deleteCustomExercise(auth.currentUser.uid, exerciseId);
            setCustomExercises(prev => prev.filter(e => e.id !== exerciseId));
            showToast('Exercise deleted', 'success');
        } catch (error) {
            showToast('Failed to delete exercise', 'error');
        }
    };

    const handleDeleteTemplate = async (templateId: string, name: string) => {
        if (!auth.currentUser) return;
        const confirmed = await confirm({
            title: 'Delete Template',
            message: `Are you sure you want to delete "${name}"?`,
            confirmText: 'Delete',
            cancelText: 'Keep'
        });
        if (!confirmed) return;
        try {
            await WorkoutService.deleteTemplate(auth.currentUser.uid, templateId);
            setTemplates(prev => prev.filter(t => t.id !== templateId));
            showToast('Template deleted', 'success');
        } catch (error) {
            showToast('Failed to delete template', 'error');
        }
    };

    // Template editor helpers
    const openCreateTemplate = () => {
        setEditingTemplate(null);
        setTemplateNameDraft('');
        setTemplateExercisesDraft([]);
        setIsTemplateEditorOpen(true);
    };

    const openEditTemplate = (t: WorkoutTemplate) => {
        // Deep clone exercises and ensure ids exist
        const cloned = (t.exercises || []).map((ex: any) => ({ ...ex, id: ex.id || crypto.randomUUID(), sets: Array.isArray(ex.sets) ? ex.sets.map((s: any) => ({ ...s, id: s.id || crypto.randomUUID() })) : [] }));
        setEditingTemplate(t);
        setTemplateNameDraft(t.name || '');
        setTemplateExercisesDraft(cloned);
        setIsTemplateEditorOpen(true);
    };

    const addExerciseToDraft = (exercise: any) => {
        setIsSelectorOpenForTemplates(false);
        const initialSet = { id: crypto.randomUUID(), weight: 0, reps: 0, duration: 0, distance: 0, completed: false };
        const newEx = { id: crypto.randomUUID(), name: exercise.name, sets: [initialSet] };
        setTemplateExercisesDraft(prev => [...prev, newEx]);
    };

    const updateDraftExercise = (index: number, updated: any) => {
        setTemplateExercisesDraft(prev => {
            const next = [...prev];
            next[index] = updated;
            return next;
        });
    };

    const removeDraftExercise = (index: number) => {
        setTemplateExercisesDraft(prev => prev.filter((_, i) => i !== index));
    };

    const closeTemplateEditor = () => {
        setIsTemplateEditorOpen(false);
        setEditingTemplate(null);
        setTemplateNameDraft('');
        setTemplateExercisesDraft([]);
        setIsSelectorOpenForTemplates(false);
    };

    const saveDraftTemplate = async () => {
        if (!auth.currentUser || !templateNameDraft.trim()) return;
        setTemplateSaving(true);
        try {
            // sanitize exercises to store minimal shape (name + sets)
            const exercisesToSave = templateExercisesDraft.map(ex => ({ ...ex, sets: Array.isArray(ex.sets) ? ex.sets : [] }));
            if (editingTemplate && editingTemplate.id) {
                await WorkoutService.updateTemplate(auth.currentUser.uid, editingTemplate.id, templateNameDraft.trim(), exercisesToSave);
                showToast('Template updated', 'success');
            } else {
                await WorkoutService.saveTemplate(auth.currentUser.uid, templateNameDraft.trim(), exercisesToSave);
                showToast('Template created', 'success');
            }
            // Refresh templates list
            const refreshed = await WorkoutService.getTemplates(auth.currentUser.uid);
            setTemplates(refreshed);
            closeTemplateEditor();
        } catch (err) {
            console.error('Failed to save template:', err);
            showToast('Failed to save template', 'error');
        } finally {
            setTemplateSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500 shadow-lg shadow-cyan-500/20"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 animate-[fade-in_0.3s_ease-out]">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2.5 bg-white/5 rounded-2xl text-[#94a3b8] hover:text-white hover:bg-white/10 transition-all active:scale-90 shadow-sm border border-white/5"
                >
                    <ChevronLeft size={22} strokeWidth={2.5} />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#111827] to-[#1A2236] rounded-2xl flex items-center justify-center shadow-lg border border-white/5">
                        <Settings size={20} className="text-[#22D3EE]" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Settings</h2>
                        <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em]">Preferences & Data</p>
                    </div>
                </div>
            </div>

            {/* Preferences */}
            <section className="bg-[#1A2236] rounded-3xl shadow-xl border border-white/5 p-6">
                <h3 className="text-[10px] font-black text-white/30 mb-5 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-8 h-1 bg-[#3B82F6] rounded-full" />
                    Preferences
                </h3>
                <div className="space-y-3">
                    {/* Rest Timer */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div>
                            <p className="font-bold text-white text-sm">Rest Timer</p>
                            <p className="text-xs text-[#94a3b8]">Auto-trigger timer when a set is marked complete</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={restTimerEnabled} onChange={async (e) => {
                                const val = e.target.checked;
                                setRestTimerEnabled(val);
                                if (auth.currentUser) await UserService.updateUserProfile(auth.currentUser.uid, { restTimerEnabled: val });
                                showToast('Rest timer preference updated', 'success');
                            }} />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#22D3EE]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#111827] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#22D3EE]"></div>
                        </label>
                    </div>

                    {/* Prefill Previous Workout */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div>
                            <p className="font-bold text-white text-sm">Prefill Previous Workout</p>
                            <p className="text-xs text-[#94a3b8]">Auto-fill sets, reps, and weights from your last session</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={prefillPreviousWorkout} onChange={async (e) => {
                                const val = e.target.checked;
                                setPrefillPreviousWorkout(val);
                                if (auth.currentUser) await UserService.updateUserProfile(auth.currentUser.uid, { prefillPreviousWorkout: val });
                                showToast('Workout prefill preference updated', 'success');
                            }} />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#22D3EE]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#111827] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#22D3EE]"></div>
                        </label>
                    </div>

                    {/* Units Placeholder */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border-2 border-dashed border-white/5">
                        <div>
                            <p className="font-bold text-[#94a3b8] text-sm">Units (kg / lbs)</p>
                            <p className="text-white/10 text-[9px] mt-0.5 uppercase tracking-widest font-black">Coming Soon</p>
                        </div>
                        <Settings size={20} className="text-white/10" />
                    </div>

                    {/* Theme Placeholder */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border-2 border-dashed border-white/5">
                        <div>
                            <p className="font-bold text-[#94a3b8] text-sm">App Theme</p>
                            <p className="text-white/10 text-[9px] mt-0.5 uppercase tracking-widest font-black">Coming Soon</p>
                        </div>
                        <Settings size={20} className="text-white/10" />
                    </div>

                    {/* Notifications Placeholder */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border-2 border-dashed border-white/5">
                        <div>
                            <p className="font-bold text-[#94a3b8] text-sm">Notifications</p>
                            <p className="text-white/10 text-[9px] mt-0.5 uppercase tracking-widest font-black">Coming Soon</p>
                        </div>
                        <Settings size={20} className="text-white/10" />
                    </div>
                </div>
            </section>

            {/* Manage Custom Exercises */}
            <section className="bg-[#1A2236] rounded-3xl shadow-xl border border-white/5 overflow-hidden">
                <button
                    onClick={() => setCustomSectionOpen(!customSectionOpen)}
                    className="w-full p-5 sm:p-6 flex justify-between items-center text-left hover:bg-white/5 transition-colors"
                >
                    <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-8 h-1 bg-[#22D3EE] rounded-full" />
                        Custom Exercises
                        <span className="text-[10px] font-black text-[#22D3EE] normal-case tracking-normal">({customExercises.length})</span>
                    </h3>
                    {customSectionOpen ? <ChevronUp size={20} className="text-white/20" /> : <ChevronDown size={20} className="text-white/20" />}
                </button>

                {customSectionOpen && (
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-3">
                        {customExercises.length > 0 ? (
                            <div className="space-y-2">
                                {customExercises.map(ex => (
                                    <div key={ex.id} className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl border border-white/5">
                                        <div>
                                            <p className="font-bold text-white text-sm">{ex.name}</p>
                                            <p className="text-[10px] text-[#94a3b8] uppercase tracking-[0.2em] font-black">
                                                {ex.category} • {ex.fields?.join(', ') || 'sets, reps, weight'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteCustom(ex.id, ex.name)}
                                            className="p-2 text-white/10 hover:text-[#F97316] transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-400 text-center py-4">No custom exercises yet.</p>
                        )}

                        {showAddForm ? (
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                                <input
                                    type="text"
                                    placeholder="Exercise name"
                                    className="w-full p-4 border border-white/10 rounded-xl bg-[#111827] text-white outline-none focus:ring-2 focus:ring-[#22D3EE]/30 text-sm font-bold tracking-tight"
                                    value={newExName}
                                    onChange={e => setNewExName(e.target.value)}
                                    autoFocus
                                />
                                <select
                                    className="w-full p-4 border border-white/10 rounded-xl bg-[#111827] text-white outline-none focus:ring-2 focus:ring-[#22D3EE]/30 text-sm font-bold appearance-none"
                                    value={newExCategory}
                                    onChange={e => setNewExCategory(e.target.value)}
                                >
                                    {categories.map((cat: string) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] px-1">Parameters</label>
                                    <div className="flex flex-wrap gap-2">
                                        {AVAILABLE_FIELDS.map(f => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => handleFieldToggle(f.id)}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                                    newExFields.includes(f.id)
                                                        ? 'bg-[#22D3EE]/10 border-[#22D3EE]/30 text-[#22D3EE]'
                                                        : 'bg-white/5 border-white/5 text-white/20 hover:text-white/40'
                                                }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleAddCustom}
                                        disabled={!newExName.trim()}
                                        className="flex-1 bg-gradient-to-r from-[#22D3EE] to-[#3B82F6] text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 disabled:opacity-50 active:scale-95 transition-all"
                                    >
                                        Save Exercise
                                    </button>
                                    <button
                                        onClick={() => { setShowAddForm(false); setNewExName(''); setNewExFields(['sets', 'reps', 'weight']); }}
                                        className="flex-1 bg-white/5 text-[#94a3b8] py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 active:scale-95 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-white/5 rounded-2xl text-[#94a3b8]/40 hover:border-[#22D3EE]/30 hover:text-[#22D3EE] transition-all text-[10px] font-black uppercase tracking-[0.2em]"
                            >
                                <Plus size={16} strokeWidth={3} />
                                Add Custom Exercise
                            </button>
                        )}
                    </div>
                )}
            </section>

            {/* Manage Templates */}
            <section className="bg-[#1A2236] rounded-3xl shadow-xl border border-white/5 overflow-hidden">
                <button
                    onClick={() => setTemplatesSectionOpen(!templatesSectionOpen)}
                    className="w-full p-5 sm:p-6 flex justify-between items-center text-left hover:bg-white/5 transition-colors"
                >
                    <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-8 h-1 bg-[#22C55E] rounded-full" />
                        Templates
                        <span className="text-[10px] font-black text-[#22D3EE] normal-case tracking-normal">({templates.length})</span>
                    </h3>
                    {templatesSectionOpen ? <ChevronUp size={20} className="text-white/20" /> : <ChevronDown size={20} className="text-white/20" />}
                </button>

                {templatesSectionOpen && (
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-3">
                        {templates.length > 0 ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 gap-3">
                                    {templates.map(t => (
                                        <div key={t.id} className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl border border-white/5">
                                            <div>
                                                <p className="font-bold text-white text-sm">{t.name}</p>
                                                <p className="text-[10px] text-[#94a3b8] uppercase tracking-[0.2em] font-black">{t.exercises.length} Exercises</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openEditTemplate(t)}
                                                    className="p-2 text-white/20 hover:text-[#22D3EE] transition-colors"
                                                    aria-label={`Edit ${t.name}`}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTemplate(t.id, t.name)}
                                                    className="p-2 text-white/10 hover:text-[#F97316] transition-colors"
                                                    aria-label={`Delete ${t.name}`}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={openCreateTemplate}
                                    className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-white/5 rounded-2xl text-[#94a3b8]/40 hover:border-[#22D3EE]/30 hover:text-[#22D3EE] transition-all text-[10px] font-black uppercase tracking-[0.2em]"
                                >
                                    <Plus size={16} strokeWidth={3} />
                                    Add Template
                                </button>
                            </div>
                        ) : (
                            <div className="py-4">
                                <button
                                    onClick={openCreateTemplate}
                                    className="w-full flex items-center justify-center gap-2 p-6 border-2 border-dashed border-white/5 rounded-2xl text-[#94a3b8]/40 hover:border-[#22D3EE]/30 hover:text-[#22D3EE] transition-all text-[12px] font-black uppercase tracking-[0.2em]"
                                >
                                    <Plus size={18} strokeWidth={3} />
                                    + ADD TEMPLATE
                                </button>
                            </div>
                        )}

                        {/* Template Editor Modal */}
                        {isTemplateEditorOpen && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fade-in_0.2s]">
                                <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border dark:border-zinc-800 w-full max-w-3xl p-6 relative">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">{editingTemplate ? 'Edit Template' : 'Create Template'}</h3>
                                        <button onClick={closeTemplateEditor} className="text-zinc-400 hover:text-white">
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Template name"
                                        className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl border dark:border-zinc-700 dark:text-white font-bold outline-none focus:ring-2 focus:ring-cyan-500 mb-4"
                                        value={templateNameDraft}
                                        onChange={(e) => setTemplateNameDraft(e.target.value)}
                                        autoFocus
                                    />

                                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {templateExercisesDraft.length === 0 ? (
                                            <div className="p-6 text-center text-zinc-500 font-bold">No exercises yet. Add from the selector below.</div>
                                        ) : (
                                            templateExercisesDraft.map((ex, idx) => (
                                                <ExerciseCard
                                                    key={ex.id}
                                                    exercise={ex}
                                                    index={idx}
                                                    onUpdate={(updatedEx: any) => updateDraftExercise(idx, updatedEx)}
                                                    onRemove={() => removeDraftExercise(idx)}
                                                    isPR={false}
                                                    exerciseFields={
                                                        (() => {
                                                            const cfg = allExercisesMap[ex.name];
                                                            if (!cfg) return ['sets', 'reps', 'weight'];
                                                            const fieldsSet = new Set<string>(cfg.fields || []);
                                                            if (cfg.trackingModes) {
                                                                cfg.trackingModes.forEach((mode: string) => {
                                                                    if (mode === 'weight') fieldsSet.add('weight');
                                                                    if (mode === 'reps') fieldsSet.add('reps');
                                                                    if (mode === 'duration' || mode === 'holdDuration' || mode === 'stretchTime') fieldsSet.add('duration');
                                                                    if (mode === 'distance') fieldsSet.add('distance');
                                                                });
                                                            }
                                                            return Array.from(fieldsSet);
                                                        })()
                                                    }
                                                    restTimerEnabled={false}
                                                    onStartRestTimer={() => { /* noop in template editor */ }}
                                                />
                                            ))
                                        )}
                                    </div>

                                    <div className="mt-4 flex gap-3">
                                        <button
                                            onClick={() => setIsSelectorOpenForTemplates(true)}
                                            className="flex-1 p-3 bg-white/5 text-[#94a3b8] rounded-xl font-black uppercase tracking-widest hover:bg-white/10"
                                        >
                                            Add Exercise
                                        </button>
                                        <button
                                            onClick={closeTemplateEditor}
                                            className="flex-1 p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={saveDraftTemplate}
                                            disabled={!templateNameDraft.trim() || templateSaving}
                                            className="flex-1 p-3 bg-cyan-500 text-white font-black uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            {templateSaving ? 'Saving...' : (editingTemplate ? 'Save Changes' : 'Save Template')}
                                        </button>
                                    </div>

                                    {isSelectorOpenForTemplates && (
                                        <ExerciseSelector onSelect={addExerciseToDraft} onClose={() => setIsSelectorOpenForTemplates(false)} />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* App Info */}
            <div className="text-center pt-4 pb-8">
                <p className="text-[10px] font-bold text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">Strive v1.0</p>
            </div>
        </div>
    );
};
