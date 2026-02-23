#!/usr/bin/env swift
//
// Syag Apple Foundation Models bridge.
// Reads JSON from stdin: { "messages": [ { "role": "system"|"user"|"assistant", "content": "..." } ], "stream": false }
// Or { "check": true } to verify availability (exit 0 if available).
// Writes full response to stdout, or NDJSON stream lines: {"text":"chunk"}\n then {"done":true}\n
// Requires macOS 26+ (Tahoe), Apple Silicon, and Foundation Models framework.
//

import Foundation

#if canImport(FoundationModels)
import FoundationModels
#endif

func writeStderr(_ s: String) {
  FileHandle.standardError.write((s + "\n").data(using: .utf8)!)
}

func readStdinJSON() -> [String: Any]? {
  let data = FileHandle.standardInput.readDataToEndOfFile()
  guard let str = String(data: data, encoding: .utf8),
        let d = str.data(using: .utf8),
        let obj = try? JSONSerialization.jsonObject(with: d) as? [String: Any] else {
    return nil
  }
  return obj
}

func writeNDJSON(_ obj: [String: Any]) {
  guard let data = try? JSONSerialization.data(withJSONObject: obj),
        let s = String(data: data, encoding: .utf8) else { return }
  print(s)
  fflush(stdout)
}

#if canImport(FoundationModels)
func runCheck() -> Bool {
  let model = SystemLanguageModel.default
  switch model.availability {
  case .available:
    return true
  case .unavailable(let reason):
    writeStderr("Foundation model unavailable: \(reason)")
    return false
  @unknown default:
    return false
  }
}

func buildInstructionsAndPrompt(from messages: [[String: Any]]) -> (instructions: String, prompt: String) {
  var systemContent = ""
  var turns: [String] = []
  for m in messages {
    let role = (m["role"] as? String) ?? "user"
    let content = (m["content"] as? String) ?? ""
    if role == "system" {
      systemContent = content
    } else if role == "user" {
      turns.append("User: \(content)")
    } else if role == "assistant" {
      turns.append("Assistant: \(content)")
    }
  }
  let prompt = turns.joined(separator: "\n\n")
  return (systemContent, prompt)
}

@main
struct SyagAppleLLM {
  static func main() async {
    guard let input = readStdinJSON() else {
      writeStderr("Invalid JSON on stdin")
      exit(1)
    }

    if input["check"] as? Bool == true {
      exit(runCheck() ? 0 : 1)
    }

    guard let messages = input["messages"] as? [[String: Any]], !messages.isEmpty else {
      writeStderr("Missing or empty 'messages' array")
      exit(2)
    }

    let stream = input["stream"] as? Bool ?? false
    let (instructions, prompt) = buildInstructionsAndPrompt(from: messages)

    do {
      let session = LanguageModelSession(instructions: instructions)

      if stream {
        var full = ""
        for try await snapshot in session.streamResponse(to: prompt) {
          let delta = snapshot.content
          if !delta.isEmpty {
            full += delta
            writeNDJSON(["text": delta])
          }
        }
        writeNDJSON(["done": true])
      } else {
        let response = try await session.respond(to: prompt)
        print(response.content)
        fflush(stdout)
      }
    } catch {
      writeStderr("Foundation Models error: \(error.localizedDescription)")
      exit(3)
    }
  }
}
#else
// No FoundationModels (e.g. macOS < 26 or unsupported SDK). Script entry is top-level code.
let _input = readStdinJSON()
if _input?["check"] as? Bool == true {
  writeStderr("Apple Foundation Models require macOS 26+ (Tahoe) and Apple Silicon.")
  exit(1)
}
writeStderr("Apple Foundation Models are not available. Requires macOS 26+ (Tahoe) and Apple Silicon.")
exit(2)
#endif
