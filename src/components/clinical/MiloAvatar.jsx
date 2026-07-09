import { STAFF_ASSISTANT_AVATAR, STAFF_ASSISTANT_NAME } from "../../lib/staffAssistant";

export default function MiloAvatar({ size = 36, rounded, style, ...props }) {
  const borderRadius = rounded ?? (size >= 48 ? 14 : size >= 32 ? 10 : "50%");

  return (
    <img
      src={STAFF_ASSISTANT_AVATAR}
      alt={STAFF_ASSISTANT_NAME}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius,
        objectFit: "cover",
        flexShrink: 0,
        border: "1px solid rgba(124,111,247,0.35)",
        ...style,
      }}
      {...props}
    />
  );
}
