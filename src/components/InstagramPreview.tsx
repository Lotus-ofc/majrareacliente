import { useState } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Play,
  ImageOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import majrLogo from "@/assets/logo-majr.png";

export type PostFormat = "single" | "carousel" | "reel";

export interface InstagramPreviewProps {
  format: PostFormat;
  mediaUrls: string[];
  caption: string;
  username?: string;
  avatarUrl?: string;
  className?: string;
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url);
}

/**
 * Pixel-accurate-ish Instagram simulation.
 * - Feed/Carousel: 4:5 portrait (1080x1350)
 * - Reel: 9:16 portrait (1080x1920)
 */
export function InstagramPreview({
  format,
  mediaUrls,
  caption,
  username = "seu_perfil",
  avatarUrl,
  className,
}: InstagramPreviewProps) {
  if (format === "reel") {
    return (
      <ReelPreview
        mediaUrl={mediaUrls[0]}
        caption={caption}
        username={username}
        avatarUrl={avatarUrl}
        className={className}
      />
    );
  }
  return (
    <FeedPreview
      mediaUrls={mediaUrls}
      caption={caption}
      username={username}
      avatarUrl={avatarUrl}
      isCarousel={format === "carousel"}
      className={className}
    />
  );
}

function Avatar({ url, username }: { url?: string; username: string }) {
  return (
    <div className="relative h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
      <div className="h-full w-full overflow-hidden rounded-full border-2 border-black bg-zinc-800">
        {url ? (
          <img src={url} alt={username} className="h-full w-full object-cover" />
        ) : (
          <img src={majrLogo} alt="" className="h-full w-full object-cover p-1" />
        )}
      </div>
    </div>
  );
}

function FeedPreview({
  mediaUrls,
  caption,
  username,
  avatarUrl,
  isCarousel,
  className,
}: {
  mediaUrls: string[];
  caption: string;
  username: string;
  avatarUrl?: string;
  isCarousel: boolean;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const slides = mediaUrls.length > 0 ? mediaUrls : [""];
  const [showFullCaption, setShowFullCaption] = useState(false);

  const next = () => setIndex((i) => Math.min(i + 1, slides.length - 1));
  const prev = () => setIndex((i) => Math.max(i - 1, 0));

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[420px] overflow-hidden rounded-xl border border-zinc-800 bg-black text-white shadow-2xl",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <Avatar url={avatarUrl} username={username} />
          <div className="leading-tight">
            <p className="text-[13px] font-semibold">{username}</p>
            <p className="text-[11px] text-zinc-400">Patrocinado · Brasil</p>
          </div>
        </div>
        <MoreHorizontal className="h-5 w-5" />
      </div>

      {/* Media — 4:5 */}
      <div className="relative aspect-[4/5] w-full bg-zinc-900">
        {slides[index] ? (
          isVideo(slides[index]) ? (
            <video
              key={slides[index]}
              src={slides[index]}
              className="h-full w-full object-cover"
              controls
              playsInline
            />
          ) : (
            <img
              src={slides[index]}
              alt=""
              className="h-full w-full object-cover"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-600">
            <ImageOff className="h-10 w-10" />
          </div>
        )}

        {isCarousel && slides.length > 1 && (
          <>
            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm">
              {index + 1}/{slides.length}
            </span>
            {index > 0 && (
              <button
                type="button"
                onClick={prev}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-1 text-zinc-900 shadow hover:bg-white"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {index < slides.length - 1 && (
              <button
                type="button"
                onClick={next}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-1 text-zinc-900 shadow hover:bg-white"
                aria-label="Próximo"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
        <div className="flex items-center gap-3.5">
          <Heart className="h-6 w-6" />
          <MessageCircle className="h-6 w-6" />
          <Send className="h-6 w-6" />
        </div>
        {isCarousel && slides.length > 1 ? (
          <div className="flex items-center gap-1">
            {slides.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  i === index ? "bg-sky-500" : "bg-zinc-600",
                )}
              />
            ))}
          </div>
        ) : (
          <span />
        )}
        <Bookmark className="h-6 w-6" />
      </div>

      {/* Likes + caption */}
      <div className="space-y-1 px-3 pb-3 text-[13px]">
        <p className="font-semibold">1.247 curtidas</p>
        <p className="whitespace-pre-wrap leading-snug">
          <span className="font-semibold">{username}</span>{" "}
          {caption ? (
            <CaptionText
              text={caption}
              expanded={showFullCaption}
              onExpand={() => setShowFullCaption(true)}
            />
          ) : (
            <span className="italic text-zinc-500">Sem legenda</span>
          )}
        </p>
        <p className="pt-1 text-[11px] uppercase tracking-wide text-zinc-500">
          Há 2 horas
        </p>
      </div>
    </div>
  );
}

function CaptionText({
  text,
  expanded,
  onExpand,
}: {
  text: string;
  expanded: boolean;
  onExpand: () => void;
}) {
  const LIMIT = 125;
  if (expanded || text.length <= LIMIT) {
    return <span>{text}</span>;
  }
  return (
    <>
      <span>{text.slice(0, LIMIT)}…</span>{" "}
      <button
        type="button"
        onClick={onExpand}
        className="text-zinc-400 hover:text-zinc-200"
      >
        mais
      </button>
    </>
  );
}

function ReelPreview({
  mediaUrl,
  caption,
  username,
  avatarUrl,
  className,
}: {
  mediaUrl?: string;
  caption: string;
  username: string;
  avatarUrl?: string;
  className?: string;
}) {
  const [muted, setMuted] = useState(true);
  const isVid = mediaUrl ? isVideo(mediaUrl) : false;

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl border border-zinc-800 bg-black text-white shadow-2xl",
        className,
      )}
    >
      <div className="relative aspect-[9/16] w-full bg-zinc-900">
        {mediaUrl ? (
          isVid ? (
            <video
              src={mediaUrl}
              className="h-full w-full object-cover"
              autoPlay
              loop
              muted={muted}
              playsInline
              controls={false}
            />
          ) : (
            <img
              src={mediaUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-600">
            <ImageOff className="h-10 w-10" />
          </div>
        )}

        {/* Top overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-3 py-3">
          <span className="text-[15px] font-semibold">Reels</span>
          {isVid && (
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="pointer-events-auto rounded-full bg-black/40 p-1.5 backdrop-blur-sm"
              aria-label={muted ? "Ativar som" : "Silenciar"}
            >
              {muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {!isVid && mediaUrl && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/40 p-3 backdrop-blur-sm">
              <Play className="h-6 w-6 fill-white" />
            </div>
          </div>
        )}

        {/* Right action rail */}
        <div className="absolute bottom-20 right-2 flex flex-col items-center gap-4">
          <ActionIcon icon={<Heart className="h-6 w-6" />} label="12,4 mil" />
          <ActionIcon icon={<MessageCircle className="h-6 w-6" />} label="328" />
          <ActionIcon icon={<Send className="h-6 w-6" />} label="Compart." />
          <ActionIcon icon={<Bookmark className="h-6 w-6" />} label="Salvar" />
          <MoreHorizontal className="h-6 w-6" />
        </div>

        {/* Bottom caption block */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-4 pt-10">
          <div className="mb-2 flex items-center gap-2">
            <Avatar url={avatarUrl} username={username} />
            <span className="text-[13px] font-semibold">{username}</span>
            <span className="rounded border border-white/70 px-1.5 py-px text-[10px] font-semibold">
              Seguir
            </span>
          </div>
          <p className="line-clamp-3 whitespace-pre-wrap text-[12.5px] leading-snug">
            {caption || (
              <span className="italic text-zinc-300">Sem legenda</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function ActionIcon({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  );
}
