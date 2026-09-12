import {
    publicSupabase,
} from '../lib/publicSupabase';

export type Category = {
  id: string;
  category_no: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
};

export async function getCategories(): Promise<
  Category[]
> {
  const { data, error } =
    await publicSupabase
      .from('categories')
      .select(`
        id,
        category_no,
        name,
        slug,
        description,
        image_url,
        is_active
      `)
      .eq('is_active', true)
      .order('category_no', {
        ascending: true,
      });

  if (error) {
    console.error(
      'getCategories error:',
      error
    );

    throw error;
  }

  return data ?? [];
}