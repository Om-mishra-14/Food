// Line icons from the Servd redesign (24×24 viewBox, stroke = currentColor unless given).
const S = ({ size = 20, stroke = "currentColor", sw = 1.8, fill = "none", children, style, lj = "round" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin={lj} style={style} aria-hidden="true">
    {children}
  </svg>
);

export const IconHome = (p) => <S {...p}><path d="M3.5 10.5L12 4l8.5 6.5V20h-5.5v-6h-6v6H3.5z" /></S>;
export const IconCompass = (p) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></S>;
export const IconGlobe = (p) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9S14.6 18.4 12 21c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" /></S>;
export const IconBookmark = ({ fill = "none", ...p }) => <S fill={fill} {...p}><path d="M6 3.5h12v17l-6-4-6 4z" /></S>;
export const IconCalendar = (p) => <S {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></S>;
export const IconBox = (p) => <S {...p}><path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5l9 4.5 9-4.5M12 12v9" /></S>;
export const IconChef = (p) => <S {...p}><path d="M6 13.9A4 4 0 0 1 7.4 6a5 5 0 0 1 9.2 0A4 4 0 0 1 18 13.9V20H6z" /><path d="M6 16.5h12" /></S>;
export const IconSparkle = ({ size = 18, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true"><path d="M12 2.5l2.2 6.3 6.3 2.2-6.3 2.2L12 19.5l-2.2-6.3L3.5 11l6.3-2.2z" /></svg>
);
export const IconFlame = ({ size = 16, color = "#E11D24" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" /></svg>
);
export const IconStar = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#E11D24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.5 6.6-.8z" /></svg>
);
export const IconArrowRight = ({ size = 18, stroke = "#fff", sw = 2.4 }) => <S size={size} stroke={stroke} sw={sw}><path d="M5 12h14M13 6l6 6-6 6" /></S>;
export const IconArrowLeft = ({ size = 18, stroke = "#121212", sw = 2.2 }) => <S size={size} stroke={stroke} sw={sw}><path d="M19 12H5M11 6l-6 6 6 6" /></S>;
export const IconCheck = ({ size = 12, stroke = "#fff", sw = 3.2 }) => <S size={size} stroke={stroke} sw={sw}><path d="M5 12.5l4.5 4.5L19 7.5" /></S>;
export const IconX = ({ size = 12, stroke = "currentColor", sw = 3 }) => <S size={size} stroke={stroke} sw={sw}><path d="M6 6l12 12M18 6L6 18" /></S>;
export const IconPlus = ({ size = 12, stroke = "#fff", sw = 3.2 }) => <S size={size} stroke={stroke} sw={sw}><path d="M12 5v14M5 12h14" /></S>;
export const IconList = ({ size = 12, stroke = "#121212", sw = 3 }) => <S size={size} stroke={stroke} sw={sw}><path d="M8 7h11M8 12h11M8 17h11M4 7h.01M4 12h.01M4 17h.01" /></S>;
export const IconSwap = ({ size = 16, stroke = "currentColor", sw = 2.2, style }) => <S size={size} stroke={stroke} sw={sw} style={style}><path d="M4 8h13l-3-3M20 16H7l3 3" /></S>;
export const IconClock = ({ size = 18, stroke = "#E11D24", sw = 2 }) => <S size={size} stroke={stroke} sw={sw}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>;
export const IconPeople = ({ size = 18, stroke = "#E11D24", sw = 2 }) => <S size={size} stroke={stroke} sw={sw}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5A6.5 6.5 0 0 1 21.5 20" /></S>;
export const IconFilter = ({ size = 16, sw = 2.2 }) => <S size={size} sw={sw}><path d="M4 6h16M7 12h10M10 18h4" /></S>;
export const IconLock = ({ size = 14, stroke = "#fff" }) => <S size={size} stroke={stroke} sw={2.4}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></S>;
export const IconShare = ({ size = 22, stroke = "#121212" }) => <S size={size} stroke={stroke} sw={1.9}><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1" /></S>;
export const IconSearch = ({ size = 18, stroke = "#6A6A72", sw = 2.2 }) => <S size={size} stroke={stroke} sw={sw}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></S>;
export const IconCamera = ({ size = 18, stroke = "currentColor", sw = 2 }) => <S size={size} stroke={stroke} sw={sw}><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.5-2.5h5L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" /><circle cx="12" cy="13" r="3.2" /></S>;
export const IconUpload = ({ size = 18, stroke = "#121212", sw = 2 }) => <S size={size} stroke={stroke} sw={sw}><path d="M12 16V4M7 9l5-5 5 5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" /></S>;
export const IconScan = ({ size = 18, stroke = "#fff", sw = 2 }) => <S size={size} stroke={stroke} sw={sw}><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M4 12h16" /></S>;
export const IconMic = ({ size = 16, stroke = "#fff" }) => <S size={size} stroke={stroke} sw={2.2} style={{ position: "relative" }}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></S>;
export const IconBulb = ({ size = 22 }) => <S size={size} stroke="#E11D24" sw={2} style={{ flex: "none" }}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></S>;
export const IconTimer = ({ size = 20 }) => <S size={size} stroke="#E11D24" sw={2}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 1.5M9.5 2.5h5" /></S>;
export const IconCookbook = ({ size = 24, stroke = "#E11D24" }) => <S size={size} stroke={stroke} sw={1.9}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" /></S>;
