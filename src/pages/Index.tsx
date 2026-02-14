import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { MeetingCard } from "@/components/MeetingCard";
import { MeetingDetail } from "@/components/MeetingDetail";
import { meetings } from "@/data/meetings";

const Index = () => {
  const [selectedId, setSelectedId] = useState(meetings[0].id);
  const selectedMeeting = meetings.find((m) => m.id === selectedId)!;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      {/* Meeting List */}
      <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-border p-4">
        <h2 className="mb-4 px-2 font-display text-lg font-semibold text-foreground">
          Recent Meetings
        </h2>
        <div className="space-y-1">
          {meetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              selected={meeting.id === selectedId}
              onClick={() => setSelectedId(meeting.id)}
            />
          ))}
        </div>
      </div>

      {/* Meeting Detail */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-10">
          <MeetingDetail meeting={selectedMeeting} />
        </div>
      </main>
    </div>
  );
};

export default Index;
