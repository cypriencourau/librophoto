import { useRef, useState } from "react"

export function useAutoSave(saveFn: () => Promise<void>) {

  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle")

  const saveQueue = useRef(Promise.resolve())
  const versionRef = useRef(0)

  const triggerSave = () => {
    const version = ++versionRef.current

    setStatus("saving")

    saveQueue.current = saveQueue.current.then(async () => {
      try {
        await saveFn()

        if (version === versionRef.current) {
          setStatus("saved")

          setTimeout(() => {
            setStatus("idle")
          }, 1200)
        }

      } catch (e) {
        console.error("save failed", e)
      }
    })
  }

  return { triggerSave, status }
}