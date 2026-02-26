export type TranscriptGroup = {
  speaker: string;
  timeStart: string;
  timeEnd: string;
  text: string;
  indices: number[];
};

/** Group consecutive same-speaker transcript lines into blocks for continuous flow display. */
export function groupTranscriptBySpeaker(
  items: { speaker: string; time: string; text: string; originalIndex: number }[]
): TranscriptGroup[] {
  if (items.length === 0) return [];

  const groups: TranscriptGroup[] = [];
  let current: TranscriptGroup = {
    speaker: items[0].speaker,
    timeStart: items[0].time,
    timeEnd: items[0].time,
    text: items[0].text.trim(),
    indices: [items[0].originalIndex],
  };

  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    if (item.speaker === current.speaker) {
      current.timeEnd = item.time;
      current.text = `${current.text} ${item.text.trim()}`.trim();
      current.indices.push(item.originalIndex);
    } else {
      groups.push(current);
      current = {
        speaker: item.speaker,
        timeStart: item.time,
        timeEnd: item.time,
        text: item.text.trim(),
        indices: [item.originalIndex],
      };
    }
  }
  groups.push(current);
  return groups;
}
