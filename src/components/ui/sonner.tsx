import { useTheme } from "next-themes"
import { CSSProperties } from "react"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-black/80 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-white group-[.toaster]:border-white/10 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl",
          title: "group-[.toast]:text-white group-[.toast]:font-medium",
          description: "group-[.toast]:text-white/60",
          actionButton: "group-[.toast]:bg-white/10 group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-white/5 group-[.toast]:text-white/60",
          success: "group-[.toaster]:!bg-emerald-500/20 group-[.toaster]:!border-emerald-500/30",
          error: "group-[.toaster]:!bg-rose-500/20 group-[.toaster]:!border-rose-500/30",
          warning: "group-[.toaster]:!bg-amber-500/20 group-[.toaster]:!border-amber-500/30",
          info: "group-[.toaster]:!bg-blue-500/20 group-[.toaster]:!border-blue-500/30",
        },
      }}
      style={
        {
          "--normal-bg": "rgba(0, 0, 0, 0.8)",
          "--normal-text": "white",
          "--normal-border": "rgba(255, 255, 255, 0.1)",
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
