import {
    publicSupabase,
} from '../lib/publicSupabase';


// ======================================================
// TYPES
// ======================================================

export type DeliveryZone = {
  id: string;

  city: string;

  delivery_fee: number;

  estimated_days: number;

  is_active: boolean;

  created_at?: string;

  updated_at?: string;
};


export type DeliveryQuote = {
  zone: DeliveryZone;

  deliveryFee: number;

  estimatedDays: number;
};


// ======================================================
// NORMALIZE DATABASE ROW
// ======================================================

function normalizeZone(
  row: any
): DeliveryZone {

  return {
    id:
      String(
        row.id
      ),

    city:
      String(
        row.city ?? ''
      ).trim(),

    delivery_fee:
      Number(
        row.delivery_fee ??
          0
      ),

    estimated_days:
      Number(
        row.estimated_days ??
          1
      ),

    is_active:
      Boolean(
        row.is_active
      ),

    created_at:
      row.created_at,

    updated_at:
      row.updated_at,
  };
}


// ======================================================
// NORMALIZE CITY
//
// This also accepts common spellings such as:
// Nintavur
// Nintahvur
// Ninthavur
// Nintavoor
// ======================================================

function normalizeCityName(
  value: string
): string {

  const cleaned =
    String(
      value ?? ''
    )
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z\s]/g,
        ''
      )
      .replace(
        /\s+/g,
        ' '
      );


  const aliases:
    Record<
      string,
      string
    > = {

      nintavur:
        'nintavur',

      nintahvur:
        'nintavur',

      ninthavur:
        'nintavur',

      nintavoor:
        'nintavur',

      ninthavoor:
        'nintavur',

      kalmunai:
        'kalmunai',

      kalmuna:
        'kalmunai',

      kalmunaii:
        'kalmunai',
    };


  return (
    aliases[
      cleaned
    ] ??
    cleaned
  );
}


// ======================================================
// GET ALL ACTIVE DELIVERY ZONES
// ======================================================

export async function getActiveDeliveryZones():
Promise<DeliveryZone[]> {

  const {
    data,
    error,
  } =
    await publicSupabase
      .from(
        'delivery_zones'
      )
      .select(`
        id,
        city,
        delivery_fee,
        estimated_days,
        is_active,
        created_at,
        updated_at
      `)
      .eq(
        'is_active',
        true
      )
      .order(
        'city',
        {
          ascending:
            true,
        }
      );


  if (
    error
  ) {

    console.error(
      'getActiveDeliveryZones error:',
      error
    );

    throw new Error(
      error.message ||
        'Unable to load delivery areas.'
    );
  }


  const zones =
    (
      data ??
      []
    ).map(
      normalizeZone
    );


  if (
    zones.length ===
    0
  ) {

    throw new Error(
      'No active delivery areas are configured.'
    );
  }


  return zones;
}


// ======================================================
// FIND DELIVERY ZONE BY CITY
// ======================================================

export async function getDeliveryZoneByCity(
  city: string
): Promise<DeliveryZone | null> {

  const cleanCity =
    normalizeCityName(
      city
    );


  if (
    !cleanCity
  ) {
    return null;
  }


  const zones =
    await getActiveDeliveryZones();


  // ====================================================
  // MATCH SUPABASE CITY AGAINST NORMALIZED USER CITY
  // ====================================================

  const exactMatch =
    zones.find(
      zone =>
        normalizeCityName(
          zone.city
        ) ===
        cleanCity
    );


  if (
    exactMatch
  ) {
    return exactMatch;
  }


  // ====================================================
  // OPTIONAL OTHER AREAS FALLBACK
  // ====================================================

  const otherAreas =
    zones.find(
      zone => {

        const normalized =
          normalizeCityName(
            zone.city
          );

        return (
          normalized ===
            'other areas' ||
          normalized ===
            'other area'
        );
      }
    );


  return (
    otherAreas ??
    null
  );
}


// ======================================================
// GET DELIVERY QUOTE
// ======================================================

export async function getDeliveryQuote(
  city: string
): Promise<DeliveryQuote> {

  const cleanCity =
    normalizeCityName(
      city
    );


  if (
    !cleanCity
  ) {

    throw new Error(
      'Please enter your city.'
    );
  }


  const zone =
    await getDeliveryZoneByCity(
      cleanCity
    );


  if (
    !zone
  ) {

    throw new Error(
      'Delivery is currently available only for Nintavur and Kalmunai.'
    );
  }


  const deliveryFee =
    Math.max(
      0,
      Number(
        zone.delivery_fee
      )
    );


  const estimatedDays =
    Math.max(
      1,
      Number(
        zone.estimated_days
      )
    );


  console.log(
    'Delivery quote:',
    {
      enteredCity:
        city,

      matchedCity:
        zone.city,

      deliveryFee,

      estimatedDays,
    }
  );


  return {
    zone,

    deliveryFee,

    estimatedDays,
  };
}


// ======================================================
// STORE PICKUP
// ======================================================

export function getStorePickupFee():
number {

  return 0;
}
