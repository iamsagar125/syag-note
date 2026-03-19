# Transcript: “Me” vs “Them”

Syag labels speakers by **audio source**, not by who is named in the conversation.

| Label | Source |
|-------|--------|
| **Me** | Your **microphone** (channel 0) |
| **Them** | **System / meeting audio** (channel 1), e.g. what plays through speakers |

So hearing your name in the transcript does **not** switch the next lines to “Me.” If your mic is muted, quiet, or a reply is very short, the **mic** path may not pass stricter voice-detection thresholds while the same words still appear on **system** audio — those lines can show as **Them**.

**Tips**

- Keep your **meeting and OS microphone unmuted** when you want reliable “Me” attribution.
- Very short utterances are harder to attribute to the mic stream than longer speech.

### Why words can disappear at chunk boundaries (or feel “cut off”)

Live transcription sends **short successive slices** of audio to the speech model. If the model only sees a slice of a sentence, it may stop early (e.g. ending on “…To”). Syag mitigates this by:

- Keeping **separate “continuation” context per channel** (mic vs system) for Whisper’s initial prompt, so “You” and “Them” don’t steal context from each other.
- Using **slightly longer buffers** before the first pass of a segment (about **5s** instead of 4s) so fewer phrases are split awkwardly.
- **Relaxing the minimum speech length** on the mic channel a bit so short phrases right after you **unmute** in Zoom/Teams are less likely to be skipped.

You can still lose audio if:

- **You pause recording in Syag** — capture is stopped and nothing is buffered during that time (by design for privacy).
- **You mute in the meeting** — your voice is not sent to other participants; Syag’s **mic** path mostly hears silence, so “Me” lines may be thin or missing unless your voice is also audible on **system/meeting audio** (e.g. echo/speaker bleed).

For **maximum completeness** at the cost of no live transcript, enable **Transcribe when stopped** (Settings): the full recording is processed once at the end, which avoids live chunk boundary issues.

### How apps like Granola tend to behave (high level)

Products such as **Granola** are usually built around **continuous capture of meeting audio** (often **system/output** or a **bot that joins the call**), **cloud transcription**, and **longer contexts** — sometimes post-processing the whole meeting rather than only tiny live slices. They don’t magically hear you when the meeting client is sending **no audio** from your mic; the difference is often **where** audio is tapped, **buffering**, and **batching** for STT. Syag’s dual path (mic + system) is similar in spirit; tuning above reduces unnecessary drops on the mic path.

## Debug: why mic chunks were skipped

If transcription seems wrong, you can log main-process skip reasons (energy, VAD, speech duration) for the microphone channel.

1. Enable the setting key **`debug-audio-capture`** in the app database (value `true`), **or** set environment variable **`SYAG_DEBUG_AUDIO=1`** before starting Syag from a terminal.
2. Watch the **main process** console (Terminal if you launched via CLI, or Electron devtools for main if attached).

This is verbose; turn it off when finished troubleshooting.
