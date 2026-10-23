export interface GameCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly route: string;
}

export const GAME_CATALOG = [
  { id: 'password', name: 'الباسورد', route: '/password' },
  { id: 'acting', name: 'التمثيل', route: '/acting' },
  { id: 'ihbid', name: 'اهبد صح', route: '/ihbid' },
  { id: 'offside', name: 'أوفسايد', route: '/offside' },
  { id: 'top10', name: 'توب 10', route: '/top10' },
  { id: 'scoresheet', name: 'سكور شيت', route: '/scoresheet' },
  { id: 'risk', name: 'ريسك', route: '/risk' },
  { id: 'bank', name: 'بنك', route: '/bank' },
  { id: 'anameen', name: 'أنا مين؟', route: '/anameen' },
  { id: 'whopicture', name: 'مين في الصورة', route: '/whopicture' },
] as const satisfies readonly GameCatalogEntry[];

export type GameOption = (typeof GAME_CATALOG)[number];
export type GameId = GameOption['id'];
