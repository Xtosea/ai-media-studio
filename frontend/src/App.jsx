import { useEffect, useState } from 'react'
import './App.css'

const API_BASE = 'https://ai-media-studio-api.xto1971.workers.dev'

const fallbackVoices = [
  {
    voice_id: 'CwhRBWXzGAHq8TQ4Fs17',
    name: 'Roger - Laid-Back, Casual, Resonant',
    labels: {
      gender: 'male',
      accent: 'american',
      descriptive: 'classy',
    },
  },
  {
    voice_id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Sarah - Mature, Reassuring, Confident',
    labels: {
      gender: 'female',
      accent: 'american',
      descriptive: 'professional',
    },
  },
  {
    voice_id: 'FGY2WhTYpPnrIDTdsKH5',
    name: 'Laura - Enthusiast, Quirky Attitude',
    labels: {
      gender: 'female',
      accent: 'american',
      descriptive: 'sassy',
    },
  },
]

function App() {
  const [text, setText] = useState(
    'Hello! Welcome to AI Media Studio. Create amazing content with AI.'
  )
  const [voices, setVoices] = useState(fallbackVoices)
  const [voiceId, setVoiceId] = useState(fallbackVoices[0].voice_id)
  const [audioUrl, setAudioUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingVoices, setLoadingVoices] = useState(true)
  const [error, setError] = useState('')
  const [activeTool, setActiveTool] = useState('tts')

  useEffect(() => {
    async function loadVoices() {
      try {
        const response = await fetch(`${API_BASE}/api/voices`)

        if (!response.ok) {
          throw new Error('Unable to load voices')
        }

        const data = await response.json()

        if (Array.isArray(data.voices) && data.voices.length > 0) {
          setVoices(data.voices)
          setVoiceId(data.voices[0].voice_id)
        }
      } catch (err) {
        console.warn('Using fallback voices:', err)
      } finally {
        setLoadingVoices(false)
      }
    }

    loadVoices()
  }, [])

  async function generateSpeech() {
    const cleanText = text.trim()

    if (!cleanText) {
      setError('Please enter some text first.')
      return
    }

    if (!voiceId) {
      setError('Please select a voice.')
      return
    }

    setLoading(true)
    setError('')

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl('')
    }

    try {
      const response = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          voiceId,
        }),
      })

      if (!response.ok) {
        let message = 'Text-to-speech generation failed.'

        try {
          const data = await response.json()
          message = data.error || message
        } catch {
          // Keep the default error message.
        }

        throw new Error(message)
      }

      const audioBlob = await response.blob()

      if (!audioBlob.size) {
        throw new Error('The server returned an empty audio file.')
      }

      const url = URL.createObjectURL(audioBlob)
      setAudioUrl(url)
    } catch (err) {
      console.error('TTS ERROR:', err)
      setError(err.message || 'Unable to generate speech.')
    } finally {
      setLoading(false)
    }
  }

  function downloadAudio() {
    if (!audioUrl) return

    const link = document.createElement('a')
    link.href = audioUrl
    link.download = 'ai-media-studio-speech.mp3'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const selectedVoice = voices.find((voice) => voice.voice_id === voiceId)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">AI</div>
          <div>
            <h1>AI Media Studio</h1>
            <span>Create with AI</span>
          </div>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          AI Studio
        </div>
      </header>

      <main className="studio">
        <aside className="sidebar">
          <button
            className={`tool-button ${activeTool === 'tts' ? 'active' : ''}`}
            onClick={() => setActiveTool('tts')}
          >
            <span className="tool-icon">🎙️</span>
            <span>
              <strong>Text to Speech</strong>
              <small>Generate AI voice</small>
            </span>
          </button>

          <button
            className={`tool-button ${activeTool === 'image-video' ? 'active' : ''}`}
            onClick={() => setActiveTool('image-video')}
          >
            <span className="tool-icon">🎬</span>
            <span>
              <strong>Image to Video</strong>
              <small>Coming next</small>
            </span>
          </button>

          <button
            className={`tool-button ${activeTool === 'lip-sync' ? 'active' : ''}`}
            onClick={() => setActiveTool('lip-sync')}
          >
            <span className="tool-icon">👄</span>
            <span>
              <strong>Lip Sync</strong>
              <small>Coming next</small>
            </span>
          </button>
        </aside>

        <section className="workspace">
          {activeTool === 'tts' ? (
            <>
              <div className="workspace-heading">
                <div>
                  <span className="eyebrow">AI AUDIO</span>
                  <h2>Text to Speech</h2>
                  <p>
                    Turn your text into natural-sounding AI speech.
                  </p>
                </div>
              </div>

              <div className="tts-grid">
                <div className="panel text-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Your script</h3>
                      <p>Enter the words you want the AI to speak.</p>
                    </div>

                    <span className="counter">
                      {text.length.toLocaleString()} characters
                    </span>
                  </div>

                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Type or paste your script here..."
                    maxLength={5000}
                  />

                  <div className="text-footer">
                    <span>Maximum 5,000 characters</span>
                    <button
                      className="clear-button"
                      type="button"
                      onClick={() => setText('')}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="panel settings-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Voice</h3>
                      <p>Choose the voice for your generation.</p>
                    </div>
                  </div>

                  <label htmlFor="voice">AI Voice</label>

                  <select
                    id="voice"
                    value={voiceId}
                    onChange={(event) => setVoiceId(event.target.value)}
                    disabled={loadingVoices || loading}
                  >
                    {voices.map((voice) => (
                      <option key={voice.voice_id} value={voice.voice_id}>
                        {voice.name}
                      </option>
                    ))}
                  </select>

                  {selectedVoice && (
                    <div className="voice-card">
                      <div className="voice-avatar">
                        {selectedVoice.labels?.gender === 'female'
                          ? '👩'
                          : '👨'}
                      </div>

                      <div>
                        <strong>{selectedVoice.name}</strong>
                        <span>
                          {selectedVoice.labels?.descriptive || 'AI voice'}
                          {selectedVoice.labels?.accent
                            ? ` • ${selectedVoice.labels.accent}`
                            : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    className="generate-button"
                    type="button"
                    onClick={generateSpeech}
                    disabled={loading || !text.trim()}
                  >
                    {loading ? (
                      <>
                        <span className="spinner"></span>
                        Generating...
                      </>
                    ) : (
                      <>🎙️ Generate Speech</>
                    )}
                  </button>

                  {error && <div className="error-message">{error}</div>}
                </div>
              </div>

              <div className="panel result-panel">
                <div className="panel-header">
                  <div>
                    <h3>Generated audio</h3>
                    <p>Your AI voice will appear here.</p>
                  </div>

                  {audioUrl && (
                    <button
                      className="download-button"
                      type="button"
                      onClick={downloadAudio}
                    >
                      ↓ Download MP3
                    </button>
                  )}
                </div>

                {audioUrl ? (
                  <div className="audio-result">
                    <div className="success-icon">✓</div>

                    <div className="audio-content">
                      <strong>Speech generated successfully</strong>
                      <span>{selectedVoice?.name || 'AI Voice'}</span>

                      <audio
                        className="audio-player"
                        controls
                        src={audioUrl}
                      >
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  </div>
                ) : (
                  <div className="empty-result">
                    <div className="empty-icon">🔊</div>
                    <strong>No audio generated yet</strong>
                    <span>
                      Enter your script and click Generate Speech.
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="coming-soon">
              <div className="coming-icon">
                {activeTool === 'image-video' ? '🎬' : '👄'}
              </div>

              <span className="eyebrow">COMING NEXT</span>

              <h2>
                {activeTool === 'image-video'
                  ? 'Image to Video'
                  : 'Lip Sync'}
              </h2>

              <p>
                This tool is part of our next AI Media Studio build step.
              </p>

              <button
                type="button"
                onClick={() => setActiveTool('tts')}
              >
                ← Back to Text to Speech
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <span>AI Media Studio</span>
        <span>Text to Speech • Image to Video • Lip Sync</span>
      </footer>
    </div>
  )
}

export default App