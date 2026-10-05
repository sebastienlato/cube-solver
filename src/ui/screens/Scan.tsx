import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { scanPhotos, type ScanFailure } from '../../vision/pipeline'
import { assessPhoto } from '../../vision/quality'
import { Button } from '../components/Button'
import { cameraUnsupported, type CameraProblem } from '../camera'
import { CameraView, type CameraHandle } from '../components/CameraView'
import { HandleEditor } from '../components/HandleEditor'
import { HoldIllustration } from '../components/HoldIllustration'
import { Icon } from '../components/Icon'
import { StepIndicator } from '../components/StepIndicator'
import { TopBar } from '../components/TopBar'
import { clearPhoto, scanInputKey, setHandles, storeUploadedPhoto, usePhotos, type CapturedPhoto } from '../photos'
import { navigate, type Route } from '../router'
import { getState, setState } from '../store'

type PhotoNumber = 1 | 2

const COPY: Record<PhotoNumber, { title: string; body: string }> = {
  1: {
    title: 'Look straight at one corner',
    body: 'Hold the cube so you see three faces: one on top, one on the left, one on the right. Fill the outline.',
  },
  2: {
    title: 'Now the opposite corner',
    body: 'Turn the cube upside down and look at the corner you couldn’t see. Any of its three faces can be on top.',
  },
}

const PROBLEM_COPY: Record<CameraProblem, string> = {
  insecure: 'The live camera only works on a secure (https) page, so upload a photo here instead.',
  missing: 'No camera was found on this device, so upload a photo instead.',
  denied: 'Camera access is turned off for this site, so upload a photo instead.',
  failed: 'The camera could not be started, so upload a photo instead.',
}

const PRIVACY = 'Photos are processed on your device and never uploaded.'

// Remembered for the visit, so a refusal on photo 1 doesn't prompt again on photo 2.
let knownProblem: CameraProblem | null = null
let prefersUpload = false

const scanRoute = (photo: PhotoNumber, stage: 'capture' | 'adjust'): Route => ({ name: 'scan', photo, stage })

export function ScanScreen({ photo, stage }: { photo: PhotoNumber; stage: 'capture' | 'adjust' }) {
  const photos = usePhotos()
  const current = photos[photo - 1]
  // Photos live in memory only, so after a refresh the flow restarts from the first one missing.
  const redirect = photo === 2 && !photos[0] ? scanRoute(1, 'capture') : stage === 'adjust' && !current ? scanRoute(photo, 'capture') : null

  useEffect(() => {
    if (redirect) navigate(redirect, { replace: true })
  }, [redirect])

  if (redirect) return null
  return stage === 'adjust' && current ? (
    <Adjust key={current.id} photo={photo} captured={current} first={photos[0]} />
  ) : (
    <Capture key={photo} photo={photo} existing={current} />
  )
}

// ---- Capture ------------------------------------------------------------------------------

function Capture({ photo, existing }: { photo: PhotoNumber; existing: CapturedPhoto | null }) {
  const slot = (photo - 1) as 0 | 1
  const camera = useRef<CameraHandle>(null)
  const [problem, setProblem] = useState<CameraProblem | null>(() => knownProblem ?? cameraUnsupported())
  const [upload, setUpload] = useState(prefersUpload)
  const [cameraCount, setCameraCount] = useState(0)
  const [ready, setReady] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const live = !problem && !upload
  const goBack = () => navigate(photo === 1 ? { name: 'home' } : scanRoute(1, 'adjust'))
  const toAdjust = () => navigate(scanRoute(photo, 'adjust'))

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Clear the field so choosing the same file again still fires a change.
    event.target.value = ''
    if (!file) return
    try {
      await storeUploadedPhoto(slot, file)
      toAdjust()
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'That file could not be opened as a photo.')
    }
  }

  const takePhoto = () => {
    if (camera.current?.capture(slot)) toAdjust()
  }

  const uploadControl = (variant: 'primary' | 'quiet', label: string) => (
    <label
      className={`relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-control font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-iris ${
        variant === 'primary'
          ? 'min-h-14 w-full bg-ink px-5 text-[1.05rem] text-on-ink hover:opacity-90'
          : 'min-h-12 px-2 text-[0.95rem] underline decoration-ink/30 underline-offset-4 hover:decoration-ink'
      }`}
    >
      {variant === 'primary' && <Icon name="upload" size={22} />}
      {label}
      <input type="file" accept="image/*" capture="environment" onChange={onFile} className="sr-only" />
    </label>
  )

  const keepExisting = existing && (
    <Button variant="quiet" onClick={toAdjust} className="text-[0.95rem]">
      Use the photo you took
    </Button>
  )

  if (live) {
    return (
      <div className="always-dark flex h-dvh flex-col bg-black">
        <div className="relative min-h-0 flex-1">
          <CameraView
            ref={camera}
            className="absolute inset-0"
            topInset={56}
            onProblem={(found) => {
              knownProblem = found
              setProblem(found)
            }}
            onReady={(count) => {
              setCameraCount(count)
              setReady(true)
            }}
          />
          <TopBar onBack={goBack} className="absolute inset-x-0 top-0 bg-black/45 backdrop-blur-sm">
            <StepIndicator current={photo === 1 ? 'Photo 1' : 'Photo 2'} />
          </TopBar>
        </div>

        <div className="shrink-0 bg-backdrop px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <div className="mx-auto flex max-w-xl items-center gap-4">
            <HoldIllustration photo={photo} className="size-[5.5rem] shrink-0" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">{COPY[photo].title}</h1>
              <p className="mt-1 text-sm leading-snug text-graphite">{COPY[photo].body}</p>
            </div>
          </div>
          <div className="mx-auto mt-4 flex max-w-xl items-center gap-2">
            <Button onClick={takePhoto} disabled={!ready} className="min-h-14 flex-1 text-[1.05rem]">
              <Icon name="camera" size={22} />
              Take photo
            </Button>
            {cameraCount > 1 && (
              <button
                type="button"
                onClick={() => camera.current?.switchCamera()}
                aria-label="Switch camera"
                title="Switch camera"
                className="grid size-14 shrink-0 place-items-center rounded-control border border-ink/25 hover:bg-ink/10"
              >
                <Icon name="flip" />
              </button>
            )}
          </div>
          <div className="mx-auto mt-1 flex max-w-xl flex-wrap items-center justify-between gap-x-3">
            <button
              type="button"
              onClick={() => {
                prefersUpload = true
                setUpload(true)
              }}
              className="min-h-11 text-[0.95rem] font-medium underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
            >
              Upload a photo instead
            </button>
            {keepExisting}
          </div>
          <p className="mx-auto max-w-xl text-xs text-graphite">{PRIVACY}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[72rem] flex-col">
      <TopBar onBack={goBack}>
        <StepIndicator current={photo === 1 ? 'Photo 1' : 'Photo 2'} />
      </TopBar>
      <main className="flex flex-1 flex-col px-5 pb-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-14 lg:px-10">
        <HoldIllustration photo={photo} className="mx-auto aspect-square w-full max-w-[min(100%,38dvh)] lg:max-w-[30rem]" />
        <div className="mt-2 lg:mt-0 lg:max-w-[26rem]">
          <h1 className="text-[1.7rem] font-semibold leading-tight tracking-tight lg:text-4xl">{COPY[photo].title}</h1>
          <p className="mt-2 text-[1.02rem] leading-relaxed text-graphite lg:mt-4 lg:text-lg">{COPY[photo].body}</p>
          {problem && (
            <p className="mt-4 flex gap-2.5 text-[0.95rem] leading-snug">
              <Icon name="alert" size={22} className="shrink-0" />
              {PROBLEM_COPY[problem]}
            </p>
          )}
          <div className="mt-6">{uploadControl('primary', 'Upload photo')}</div>
          {fileError && (
            <p role="alert" className="mt-3 text-[0.95rem]">
              {fileError}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3">
            {!problem && (
              <Button
                variant="quiet"
                className="text-[0.95rem]"
                onClick={() => {
                  prefersUpload = false
                  setUpload(false)
                }}
              >
                Use the camera
              </Button>
            )}
            {keepExisting}
          </div>
          <p className="mt-4 text-sm text-graphite">{PRIVACY}</p>
        </div>
      </main>
    </div>
  )
}

// ---- Adjust -------------------------------------------------------------------------------

function Adjust({ photo, captured, first }: { photo: PhotoNumber; captured: CapturedPhoto; first: CapturedPhoto | null }) {
  const slot = (photo - 1) as 0 | 1
  const [failure, setFailure] = useState<ScanFailure | null>(null)
  const quality = useMemo(() => assessPhoto(captured.pixels, captured.handles), [captured.pixels, captured.handles])

  const retake = (which: PhotoNumber) => {
    clearPhoto((which - 1) as 0 | 1)
    navigate(scanRoute(which, 'capture'))
  }

  const confirm = (allowAlikeCenters = false) => {
    if (photo === 1 || !first) {
      navigate(scanRoute(2, 'capture'))
      return
    }
    const outcome = scanPhotos(
      { image: first.pixels, handles: first.handles },
      { image: captured.pixels, handles: captured.handles },
      { allowAlikeCenters },
    )
    if (!outcome.ok) {
      setFailure(outcome)
      return
    }
    const inputKey = scanInputKey(first, captured)
    // Same photos and handles as last time: keep the corrections already made in Review.
    if (getState().scan?.inputKey !== inputKey) {
      setState({
        scan: { facelets: outcome.facelets, colors: outcome.colors, lowConfidence: outcome.lowConfidence, inputKey },
      })
    }
    navigate({ name: 'review' })
  }

  const warning = quality.tooDark
    ? 'This photo is quite dark, so colors may be misread. You can continue, or retake it with more light.'
    : quality.lowContrast
      ? 'This photo has very little contrast, so colors may be misread. You can continue, or retake it in clearer light.'
      : null

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[84rem] flex-col overflow-hidden">
      <TopBar onBack={() => navigate(scanRoute(photo, 'capture'))}>
        <StepIndicator current={photo === 1 ? 'Photo 1' : 'Photo 2'} />
      </TopBar>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:items-stretch lg:gap-10 lg:px-10 lg:pb-8">
        <div className="min-h-0 flex-1 px-3 lg:px-0">
          <HandleEditor
            photo={captured}
            onChange={(handles) => {
              setFailure(null)
              setHandles(slot, handles)
            }}
          />
        </div>

        <div className="shrink-0 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:w-[24rem] lg:self-center lg:px-0">
          <h1 className="text-xl font-semibold leading-tight tracking-tight lg:text-3xl">Line up the grid</h1>
          <p className="mt-1 text-[0.95rem] leading-snug text-graphite lg:mt-3 lg:text-lg">
            Drag the seven dots to the corners of the cube, until every square of the grid sits on one sticker.
          </p>

          <div aria-live="polite">
            {failure ? (
              <p role="alert" className="mt-3 flex gap-2.5 text-[0.95rem] leading-snug">
                <Icon name="alert" size={22} className="shrink-0" />
                {failure.message}
              </p>
            ) : (
              warning && (
                <p className="mt-3 flex gap-2.5 text-[0.95rem] leading-snug">
                  <Icon name="alert" size={22} className="shrink-0" />
                  {warning}
                </p>
              )
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {failure ? (
              <>
                <Button onClick={() => retake(failure.photo)} className="min-h-14 flex-1 text-[1.05rem]">
                  Retake photo {failure.photo}
                </Button>
                {failure.code === 'centers-alike' && (
                  <Button variant="secondary" onClick={() => confirm(true)} className="min-h-14">
                    Continue anyway
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => retake(photo)} className="min-h-14">
                  Retake
                </Button>
                <Button onClick={() => confirm()} className="min-h-14 flex-1 text-[1.05rem]">
                  Looks right
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
