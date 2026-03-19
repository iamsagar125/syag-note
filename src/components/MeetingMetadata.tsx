import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users, Tag, X, Plus, Check, UserPlus,
} from "lucide-react";
import { getElectronAPI } from "@/lib/electron-api";

interface Person {
  id: string;
  name: string;
  company?: string;
  role?: string;
  relationship?: string;
  meeting_role?: string;
}

interface Topic {
  id: string;
  label: string;
}

interface MeetingMetadataProps {
  noteId: string;
}

export function MeetingMetadata({ noteId }: MeetingMetadataProps) {
  const api = getElectronAPI();
  const [people, setPeople] = useState<Person[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [editingPerson, setEditingPerson] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [addingPerson, setAddingPerson] = useState(false);
  const [addingTopic, setAddingTopic] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newTopicLabel, setNewTopicLabel] = useState("");
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [peopleSuggestions, setPeopleSuggestions] = useState<Person[]>([]);
  const addPersonRef = useRef<HTMLInputElement>(null);
  const addTopicRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    if (!api?.memory) return;
    const [p, t] = await Promise.all([
      api.memory.people.forNote(noteId),
      api.memory.topics.forNote(noteId),
    ]);
    setPeople(p || []);
    setTopics(t || []);
  }, [api, noteId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Person editing
  const handleUpdatePerson = async (id: string, data: Partial<Person>) => {
    if (!api?.memory) return;
    await api.memory.people.update(id, data);
    await refresh();
    setEditingPerson(null);
  };

  const handleRemovePerson = async (personId: string) => {
    if (!api?.memory) return;
    await api.memory.people.unlinkFromNote(noteId, personId);
    await refresh();
  };

  const handleAddPerson = async () => {
    if (!api?.memory || !newPersonName.trim()) return;
    const person = await api.memory.people.upsert({ name: newPersonName.trim() });
    await api.memory.people.linkToNote(noteId, person.id);
    setNewPersonName("");
    setAddingPerson(false);
    setPeopleSuggestions([]);
    await refresh();
  };

  const handleAddExistingPerson = async (person: Person) => {
    if (!api?.memory) return;
    await api.memory.people.linkToNote(noteId, person.id);
    setNewPersonName("");
    setAddingPerson(false);
    setPeopleSuggestions([]);
    await refresh();
  };

  // Topic editing
  const handleUpdateTopic = async (id: string, label: string) => {
    if (!api?.memory || !label.trim()) return;
    await api.memory.topics.updateLabel(id, label.trim());
    await refresh();
    setEditingTopic(null);
  };

  const handleRemoveTopic = async (topicId: string) => {
    if (!api?.memory) return;
    await api.memory.topics.unlinkFromNote(noteId, topicId);
    await refresh();
  };

  const handleAddTopic = async () => {
    if (!api?.memory || !newTopicLabel.trim() || topics.length >= 2) return;
    await api.memory.topics.addToNote(noteId, newTopicLabel.trim());
    setNewTopicLabel("");
    setAddingTopic(false);
    await refresh();
  };

  // People search/autocomplete
  const handlePersonSearch = async (query: string) => {
    setNewPersonName(query);
    if (!api?.memory || query.length < 2) {
      setPeopleSuggestions([]);
      return;
    }
    if (allPeople.length === 0) {
      const all = await api.memory.people.getAll();
      setAllPeople(all || []);
      filterSuggestions(all, query);
    } else {
      filterSuggestions(allPeople, query);
    }
  };

  const filterSuggestions = (all: Person[], query: string) => {
    const q = query.toLowerCase();
    const linkedIds = new Set(people.map(p => p.id));
    const matches = all
      .filter(p => !linkedIds.has(p.id) && (p.name.toLowerCase().includes(q) || p.company?.toLowerCase().includes(q)))
      .slice(0, 5);
    setPeopleSuggestions(matches);
  };

  // Focus add inputs
  useEffect(() => {
    if (addingPerson) addPersonRef.current?.focus();
  }, [addingPerson]);
  useEffect(() => {
    if (addingTopic) addTopicRef.current?.focus();
  }, [addingTopic]);

  if (!api?.memory) return null;

  return (
    <div className="flex flex-col gap-2 mb-4">
      {/* People */}
      <div className="flex items-start gap-2 flex-wrap">
          <Users className="h-3.5 w-3.5 text-muted-foreground/50 mt-1.5 flex-shrink-0" />
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {people.map((person) => (
              <PersonChip
                key={person.id}
                person={person}
                isEditing={editingPerson === person.id}
                onStartEdit={() => setEditingPerson(person.id)}
                onUpdate={(data) => handleUpdatePerson(person.id, data)}
                onRemove={() => handleRemovePerson(person.id)}
                onCancel={() => setEditingPerson(null)}
              />
            ))}
            {addingPerson ? (
              <div className="relative">
                <input
                  ref={addPersonRef}
                  value={newPersonName}
                  onChange={(e) => handlePersonSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddPerson();
                    if (e.key === "Escape") { setAddingPerson(false); setNewPersonName(""); setPeopleSuggestions([]); }
                  }}
                  onBlur={() => {
                    // Delay to allow click on suggestion
                    setTimeout(() => { setAddingPerson(false); setNewPersonName(""); setPeopleSuggestions([]); }, 200);
                  }}
                  placeholder="Name..."
                  className="h-6 w-32 rounded-full border border-border bg-background px-2.5 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring"
                />
                {peopleSuggestions.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-border bg-popover shadow-lg z-50 overflow-hidden py-0.5">
                    {peopleSuggestions.map((s) => (
                      <button
                        key={s.id}
                        onMouseDown={(e) => { e.preventDefault(); handleAddExistingPerson(s); }}
                        className="w-full text-left px-2.5 py-1.5 text-[11px] text-foreground hover:bg-secondary transition-colors"
                      >
                        <span className="font-medium">{s.name}</span>
                        {s.company && <span className="text-muted-foreground ml-1">· {s.company}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAddingPerson(true)}
                className="flex items-center gap-0.5 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <UserPlus className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        </div>

      {/* Tags */}
      <div className="flex items-start gap-2 flex-wrap">
          <Tag className="h-3.5 w-3.5 text-muted-foreground/50 mt-1.5 flex-shrink-0" />
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {topics.map((topic) => (
              <TopicChip
                key={topic.id}
                topic={topic}
                isEditing={editingTopic === topic.id}
                onStartEdit={() => setEditingTopic(topic.id)}
                onUpdate={(label) => handleUpdateTopic(topic.id, label)}
                onRemove={() => handleRemoveTopic(topic.id)}
                onCancel={() => setEditingTopic(null)}
              />
            ))}
            {topics.length < 2 && (addingTopic ? (
              <input
                ref={addTopicRef}
                value={newTopicLabel}
                onChange={(e) => setNewTopicLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTopic();
                  if (e.key === "Escape") { setAddingTopic(false); setNewTopicLabel(""); }
                }}
                onBlur={() => { if (newTopicLabel.trim()) handleAddTopic(); else { setAddingTopic(false); setNewTopicLabel(""); } }}
                placeholder="Tag..."
                className="h-6 w-24 rounded-full border border-border bg-background px-2.5 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            ) : (
              <button
                onClick={() => setAddingTopic(true)}
                className="flex items-center gap-0.5 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <Plus className="h-2.5 w-2.5" />
              </button>
            ))}
          </div>
        </div>
    </div>
  );
}

// ── Person Chip ─────────────────────────────────────────────────────

function PersonChip({
  person,
  isEditing,
  onStartEdit,
  onUpdate,
  onRemove,
  onCancel,
}: {
  person: Person;
  isEditing: boolean;
  onStartEdit: () => void;
  onUpdate: (data: Partial<Person>) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(person.name);
  const [company, setCompany] = useState(person.company || "");
  const [role, setRole] = useState(person.role || "");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) nameRef.current?.focus();
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 rounded-lg border border-ring bg-background px-2 py-1 shadow-sm">
        <div className="flex flex-col gap-1">
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="h-5 w-28 bg-transparent text-[11px] font-medium text-foreground outline-none"
          />
          <div className="flex gap-1">
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company"
              className="h-5 w-20 bg-transparent text-[10px] text-muted-foreground outline-none"
            />
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role"
              className="h-5 w-20 bg-transparent text-[10px] text-muted-foreground outline-none"
            />
          </div>
        </div>
        <button
          onClick={() => onUpdate({ name: name.trim() || person.name, company: company.trim(), role: role.trim() })}
          className="p-0.5 rounded hover:bg-secondary text-accent"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          onClick={onCancel}
          className="p-0.5 rounded hover:bg-secondary text-muted-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  const initials = person.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="group/person flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] hover:bg-secondary/50 transition-colors">
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent/10 text-[8px] font-semibold text-accent flex-shrink-0">
        {initials}
      </span>
      <span
        onClick={onStartEdit}
        className="font-medium text-foreground cursor-pointer"
        title={[person.role, person.company].filter(Boolean).join(" · ") || "Click to edit"}
      >
        {person.name}
      </span>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover/person:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

// ── Topic Chip ──────────────────────────────────────────────────────

function TopicChip({
  topic,
  isEditing,
  onStartEdit,
  onUpdate,
  onRemove,
  onCancel,
}: {
  topic: Topic;
  isEditing: boolean;
  onStartEdit: () => void;
  onUpdate: (label: string) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(topic.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 rounded-full border border-ring bg-background px-2 py-0.5">
        <input
          ref={inputRef}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onUpdate(label.trim() || topic.label);
            if (e.key === "Escape") onCancel();
          }}
          onBlur={() => { if (label.trim()) onUpdate(label.trim()); else onCancel(); }}
          className="h-5 w-24 bg-transparent text-[11px] text-foreground outline-none"
        />
        <button
          onClick={() => onUpdate(label.trim() || topic.label)}
          className="p-0.5 rounded hover:bg-secondary text-accent"
          title="Save"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          onClick={onCancel}
          className="p-0.5 rounded hover:bg-secondary text-muted-foreground"
          title="Cancel"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="group/topic flex items-center gap-0.5 rounded-full border border-border bg-accent/5 px-2 py-0.5 text-[11px] hover:bg-accent/10 transition-colors">
      <span
        onClick={onStartEdit}
        className="text-foreground/80 cursor-pointer"
      >
        {topic.label}
      </span>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover/topic:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}
