const COLORS = ["#7c5cff", "#00b894", "#ff7a59", "#0984e3", "#e84393", "#fdcb6e", "#6c5ce7", "#00cec9"];

const colorFor = (id = "") => COLORS[[...id].reduce((acc, c) => acc + c.charCodeAt(0), 0) % COLORS.length];
const initials = (name = "?") =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export default function Avatar({ user, size = 32, online = false, title }) {
  if (!user) return null;
  return (
    <span
      className={`avatar ${online ? "online" : ""}`}
      style={{ "--size": `${size}px`, "--color": colorFor(user.id) }}
      title={title ?? user.name}
    >
      {initials(user.name)}
    </span>
  );
}
