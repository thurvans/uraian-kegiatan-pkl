import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faBars,
  faBriefcase,
  faBuilding,
  faCalendarDays,
  faChartLine,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faClipboardCheck,
  faClock,
  faDownload,
  faEnvelope,
  faEye,
  faEyeSlash,
  faFileLines,
  faFloppyDisk,
  faLock,
  faPaperPlane,
  faPenNib,
  faPencil,
  faPlus,
  faRightFromBracket,
  faShieldHalved,
  faTableColumns,
  faTrashCan,
  faTriangleExclamation,
  faUser,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

function createIcon(icon) {
  return function Icon({ size, style, ...props }) {
    const dimensions = size ? { width: size, height: size } : undefined;
    return <FontAwesomeIcon icon={icon} style={{ ...dimensions, ...style }} {...props} />;
  };
}

export const Activity = createIcon(faChartLine);
export const AlertTriangle = createIcon(faTriangleExclamation);
export const ArrowRight = createIcon(faArrowRight);
export const BriefcaseBusiness = createIcon(faBriefcase);
export const Building2 = createIcon(faBuilding);
export const CalendarDays = createIcon(faCalendarDays);
export const CheckCircle2 = createIcon(faCircleCheck);
export const ChevronLeft = createIcon(faChevronLeft);
export const ChevronRight = createIcon(faChevronRight);
export const ClipboardCheck = createIcon(faClipboardCheck);
export const Clock3 = createIcon(faClock);
export const Download = createIcon(faDownload);
export const Envelope = createIcon(faEnvelope);
export const Eye = createIcon(faEye);
export const EyeOff = createIcon(faEyeSlash);
export const FileText = createIcon(faFileLines);
export const LayoutDashboard = createIcon(faTableColumns);
export const LogOut = createIcon(faRightFromBracket);
export const Lock = createIcon(faLock);
export const Menu = createIcon(faBars);
export const PenLine = createIcon(faPenNib);
export const Pencil = createIcon(faPencil);
export const Plus = createIcon(faPlus);
export const Save = createIcon(faFloppyDisk);
export const Send = createIcon(faPaperPlane);
export const ShieldCheck = createIcon(faShieldHalved);
export const Trash2 = createIcon(faTrashCan);
export const UserRound = createIcon(faUser);
export const X = createIcon(faXmark);
