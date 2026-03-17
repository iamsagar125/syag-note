import { useState, useEffect, useCallback } from "react"
import { Sidebar, SidebarCollapseButton } from "@/components/Sidebar"
import { useSidebarVisibility } from "@/contexts/SidebarVisibilityContext"
import { isElectron, getElectronAPI } from "@/lib/electron-api"
import { useNavigate } from "react-router-dom"
import { Users, Search, FileText, Mail, Building2, Briefcase, ArrowRight, Merge } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface Person {
  id: string
  name: string
  email?: string
  company?: string
  role?: string
  relationship?: string
  first_seen?: string
  last_seen?: string
  notes?: string
  meetingCount?: number
}

const PeoplePage = () => {
  const navigate = useNavigate()
  const { sidebarOpen } = useSidebarVisibility()
  const [people, setPeople] = useState<Person[]>([])
  const [search, setSearch] = useState("")
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [personMeetings, setPersonMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const api = getElectronAPI()

  const loadPeople = useCallback(async () => {
    if (!api?.memory) {
      setLoading(false)
      return
    }
    try {
      const result = await api.memory.people.getAll()
      setPeople(result || [])
    } catch (err) {
      console.error("Failed to load people:", err)
    }
    setLoading(false)
  }, [api])

  useEffect(() => {
    loadPeople()
  }, [loadPeople])

  const loadPersonMeetings = useCallback(async (personId: string) => {
    if (!api?.memory) return
    try {
      const meetings = await api.memory.people.getMeetings(personId)
      setPersonMeetings(meetings || [])
    } catch {
      setPersonMeetings([])
    }
  }, [api])

  const handleSelectPerson = useCallback((person: Person) => {
    setSelectedPerson(person)
    loadPersonMeetings(person.id)
  }, [loadPersonMeetings])

  const filtered = search
    ? people.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase()) ||
        p.company?.toLowerCase().includes(search.toLowerCase())
      )
    : people

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div className="w-56 flex-shrink-0 overflow-hidden">
          <Sidebar />
        </div>
      )}
      <main className={cn("flex flex-1 flex-col min-w-0 relative", !sidebarOpen && isElectron && "pl-20")}>
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <SidebarCollapseButton />
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-6 py-8 font-body">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-accent" />
                <h1 className="font-display text-2xl text-foreground">People</h1>
                <span className="text-sm text-muted-foreground">
                  {people.length} {people.length === 1 ? "person" : "people"}
                </span>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people by name, email, or company..."
                className="w-full rounded-lg border border-border bg-card pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            {loading ? (
              <div className="text-center py-16">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : people.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-foreground font-medium mb-1">No people yet</p>
                <p className="text-xs text-muted-foreground">
                  Record and summarize meetings — Syag will automatically extract the people you interact with.
                </p>
              </div>
            ) : (
              <div className="flex gap-6">
                {/* People list */}
                <div className={cn("space-y-1", selectedPerson ? "w-1/2" : "w-full")}>
                  {filtered.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => handleSelectPerson(person)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors",
                        selectedPerson?.id === person.id
                          ? "bg-accent/10 border border-accent/20"
                          : "hover:bg-card border border-transparent hover:border-border"
                      )}
                    >
                      {/* Avatar */}
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent font-medium text-sm flex-shrink-0">
                        {person.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground truncate">{person.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          {person.company && (
                            <span className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                              <Building2 className="h-2.5 w-2.5" />
                              {person.company}
                            </span>
                          )}
                          {person.role && (
                            <span className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                              <Briefcase className="h-2.5 w-2.5" />
                              {person.role}
                            </span>
                          )}
                        </div>
                      </div>
                      {person.last_seen && (
                        <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
                          {(() => {
                            try { return format(new Date(person.last_seen), "MMM d") } catch { return "" }
                          })()}
                        </span>
                      )}
                    </button>
                  ))}
                  {filtered.length === 0 && search && (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No people matching "{search}"</p>
                    </div>
                  )}
                </div>

                {/* Person detail panel */}
                {selectedPerson && (
                  <div className="w-1/2 rounded-lg border border-border bg-card p-5 sticky top-4 self-start">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent font-medium text-lg flex-shrink-0">
                        {selectedPerson.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-medium text-foreground">{selectedPerson.name}</h2>
                        {selectedPerson.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" /> {selectedPerson.email}
                          </p>
                        )}
                        {selectedPerson.company && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3" /> {selectedPerson.company}
                          </p>
                        )}
                        {selectedPerson.role && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3" /> {selectedPerson.role}
                          </p>
                        )}
                      </div>
                    </div>

                    {selectedPerson.relationship && (
                      <div className="mb-4">
                        <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent">
                          {selectedPerson.relationship}
                        </span>
                      </div>
                    )}

                    {/* Meeting history */}
                    <div className="border-t border-border pt-4">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                        Meeting History ({personMeetings.length})
                      </h3>
                      {personMeetings.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No meetings found</p>
                      ) : (
                        <div className="space-y-1">
                          {personMeetings.slice(0, 10).map((meeting: any) => (
                            <button
                              key={meeting.id}
                              onClick={() => navigate(`/note/${meeting.id}`)}
                              className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-secondary transition-colors"
                            >
                              <FileText className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{meeting.title}</p>
                                <p className="text-[10px] text-muted-foreground">{meeting.date}</p>
                              </div>
                              <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default PeoplePage
