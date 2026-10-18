import type { Pool } from '../../api.service';

type ImportRow = Record<string, unknown>;

export interface ImportMetadata {
  readonly label: string;
  readonly schemaExample: string;
  readonly schemaNote: string;
  readonly previewLabel: (row: ImportRow | null, index: number) => string;
}

const text = (value: unknown): string =>
  typeof value === 'string' && value.trim() ? value.trim() : '';

const fieldLabel =
  (field: string) =>
  (row: ImportRow | null, index: number): string =>
    text(row?.[field]) || `صف ${index + 1}`;

const firstPlayer = (row: ImportRow): string => {
  const list = row['players'];
  return Array.isArray(list) && typeof list[0] === 'string' ? list[0].trim() : '';
};

const whopictureLabel = (row: ImportRow | null, index: number): string =>
  text(row?.['title']) ||
  text(row?.['photoUrl']) ||
  (row ? firstPlayer(row) : '') ||
  `صف ${index + 1}`;

const legacyMatchLabel = (row: ImportRow | null, index: number): string =>
  text(row?.['match']) ||
  text(row?.['matchLabel']) ||
  text(row?.['match_label']) ||
  `صف ${index + 1}`;

export const POOL_METADATA: Record<Pool, ImportMetadata> = {
  players: {
    label: 'أسماء اللاعبين',
    schemaExample: '[\n  { "playerName": "أشرف حكيمي" },\n  { "playerName": "محمد الشناوي" }\n]',
    schemaNote: 'كل صف: {"playerName"} — 3 أحرف على الأقل.',
    previewLabel: fieldLabel('playerName'),
  },
  ihbid: {
    label: 'اهبد صح',
    schemaExample:
      '[\n  { "questionText": "كم عدد كؤوس العالم التي فازت بها البرازيل؟", "answerText": "5" }\n]',
    schemaNote: 'كل صف: {"questionText", "answerText"} — 3 أحرف على الأقل لكل حقل.',
    previewLabel: fieldLabel('questionText'),
  },
  offside: {
    label: 'أوفسايد',
    schemaExample:
      '[\n  { "ruleText": "لاعب إيطالي" },\n  { "ruleText": "حارس مرمى فاز بكأس العالم" }\n]',
    schemaNote: 'كل صف: {"ruleText"} — 3 أحرف على الأقل.',
    previewLabel: fieldLabel('ruleText'),
  },
  top10: {
    label: 'توب 10',
    schemaExample:
      '[\n  {\n    "prompt": "أعلى 13 هدافًا في تاريخ الدوري الإنجليزي",\n    "answers": ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس",\n      "السابع", "الثامن", "التاسع", "العاشر", "الحادي عشر", "الثاني عشر", "الثالث عشر"]\n  }\n]',
    schemaNote:
      'كل صف: {"prompt", "answers"} — الإجابات 13 بالترتيب تمامًا (الأولى = المركز الأول).',
    previewLabel: fieldLabel('prompt'),
  },
  scoresheet: {
    label: 'سكور شيت',
    schemaExample:
      '[\n  {\n    "match": "نهائي كأس العالم 2022",\n    "teamA": "الأرجنتين",\n    "teamB": "فرنسا",\n' +
      '    "lineupA": ["أ1", "أ2", "أ3", "أ4", "أ5", "أ6", "أ7", "أ8", "أ9", "أ10", "أ11"],\n' +
      '    "lineupB": ["ب1", "ب2", "ب3", "ب4", "ب5", "ب6", "ب7", "ب8", "ب9", "ب10", "ب11"]\n  }\n]',
    schemaNote:
      'كل صف: {"match", "teamA", "teamB", "lineupA", "lineupB"} — كل تشكيلة 11 اسمًا تمامًا.',
    previewLabel: legacyMatchLabel,
  },
  bank: {
    label: 'بنك',
    schemaExample: '[\n  { "question": "من فاز بكأس العالم 2022؟", "answer": "الأرجنتين" }\n]',
    schemaNote: 'كل صف: {"question", "answer"} — سؤال سريع بإجابة قصيرة.',
    previewLabel: legacyMatchLabel,
  },
  risk: {
    label: 'ريسك',
    schemaExample:
      '[\n  {\n    "genre": "ريال مدريد",\n    "questions": [\n' +
      '      { "points": 5, "question": "...", "answer": "..." },\n' +
      '      { "points": 10, "question": "...", "answer": "..." },\n' +
      '      { "points": 20, "question": "...", "answer": "..." },\n' +
      '      { "points": 40, "question": "...", "answer": "..." }\n    ]\n  }\n]',
    schemaNote: 'كل صف: {"genre", "questions"} — 4 أسئلة بترتيب الدرجات 5/10/20/40.',
    previewLabel: legacyMatchLabel,
  },
  anameen: {
    label: 'أنا مين؟',
    schemaExample:
      '[\n  {\n    "player": "محمد صلاح",\n' +
      '    "clues": ["تلميح صعب 1", "تلميح صعب 2", "تلميح متوسط", "تلميح واضح", "أسهل تلميح"]\n  }\n]',
    schemaNote:
      'كل صف: {"player", "clues"} — 5 تلميحات بالترتيب تمامًا (الأصعب أولًا)، كل واحد 3 أحرف على الأقل.',
    previewLabel: fieldLabel('player'),
  },
  whopicture: {
    label: 'مين في الصورة',
    schemaExample:
      '[\n  {\n    "title": "الأهلي 2021 نهائي دوري أبطال أفريقيا",\n' +
      '    "photoUrl": "https://example.com/photo.jpg",\n' +
      '    "players": ["أ1", "أ2", "أ3", "أ4", "أ5", "أ6", "أ7", "أ8", "أ9", "أ10", "أ11"]\n  }\n]',
    schemaNote:
      'كل صف: {"title", "photoUrl", "players"} — عنوان واضح (3 أحرف على الأقل) + رابط http(s) صحيح + 11 اسمًا للصورة تمامًا.',
    previewLabel: whopictureLabel,
  },
};
