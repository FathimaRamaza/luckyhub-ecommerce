import { publicSupabase } from '../lib/publicSupabase';

export type HomeBannerTargetType =
  | 'none'
  | 'sale'
  | 'product'
  | 'category'
  | 'search';

export type HomeBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  discount_text: string | null;
  image_url: string | null;
  button_text: string;
  target_type: HomeBannerTargetType;
  target_value: string | null;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function normalizeBanner(banner: any): HomeBanner {
  return {
    id: String(banner.id),
    title: String(banner.title ?? ''),
    subtitle:
      banner.subtitle === null ||
      banner.subtitle === undefined
        ? null
        : String(banner.subtitle),
    discount_text:
      banner.discount_text === null ||
      banner.discount_text === undefined
        ? null
        : String(banner.discount_text),
    image_url:
      banner.image_url === null ||
      banner.image_url === undefined
        ? null
        : String(banner.image_url),
    button_text: String(
      banner.button_text ?? 'SHOP NOW'
    ),
    target_type: (
      banner.target_type ?? 'none'
    ) as HomeBannerTargetType,
    target_value:
      banner.target_value === null ||
      banner.target_value === undefined
        ? null
        : String(banner.target_value),
    start_at:
      banner.start_at === null ||
      banner.start_at === undefined
        ? null
        : String(banner.start_at),
    end_at:
      banner.end_at === null ||
      banner.end_at === undefined
        ? null
        : String(banner.end_at),
    is_active: Boolean(banner.is_active),
    sort_order: Number(banner.sort_order ?? 0),
    created_at: String(banner.created_at ?? ''),
    updated_at: String(banner.updated_at ?? ''),
  };
}

function isBannerCurrentlyActive(
  banner: HomeBanner
): boolean {
  if (!banner.is_active) {
    return false;
  }

  const now = Date.now();

  if (banner.start_at) {
    const startTime = new Date(
      banner.start_at
    ).getTime();

    if (
      !Number.isNaN(startTime) &&
      startTime > now
    ) {
      return false;
    }
  }

  if (banner.end_at) {
    const endTime = new Date(
      banner.end_at
    ).getTime();

    if (
      !Number.isNaN(endTime) &&
      endTime < now
    ) {
      return false;
    }
  }

  return true;
}

export async function getActiveHomeBanners(): Promise<
  HomeBanner[]
> {
  const { data, error } =
    await publicSupabase
      .from('home_banners')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', {
        ascending: true,
      })
      .order('created_at', {
        ascending: false,
      });

  if (error) {
    console.error(
      'Home banner load error:',
      error
    );

    throw error;
  }

  return (data ?? [])
    .map(normalizeBanner)
    .filter(isBannerCurrentlyActive);
}
