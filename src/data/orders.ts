export type OrderStatus =
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export type OrderItem = {
  id: number;
  name: string;
  variant: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: number;
  orderNumber: string;
  date: string;
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  deliveryMethod: string;
  items: OrderItem[];
};

export const orders: Order[] = [
  {
    id: 1,
    orderNumber: 'LH24081901',
    date: '19 Aug 2026',
    total: 1310,
    status: 'Processing',
    paymentMethod: 'Cash on Delivery',
    deliveryMethod: 'Standard Delivery',

    items: [
      {
        id: 1,
        name: 'Atlas Ballpoint Pen',
        variant: 'Blue',
        price: 50,
        quantity: 5,
      },
      {
        id: 2,
        name: 'Atlas A4 CR Book',
        variant: '200 Pages',
        price: 430,
        quantity: 2,
      },
    ],
  },

  {
    id: 2,
    orderNumber: 'LH18081902',
    date: '18 Aug 2026',
    total: 1850,
    status: 'Shipped',
    paymentMethod: 'Cash on Delivery',
    deliveryMethod: 'Standard Delivery',

    items: [
      {
        id: 3,
        name: 'A4 Colour Paper',
        variant: 'Light Blue',
        price: 1850,
        quantity: 1,
      },
    ],
  },

  {
    id: 3,
    orderNumber: 'LH15081903',
    date: '15 Aug 2026',
    total: 1200,
    status: 'Delivered',
    paymentMethod: 'Cash on Delivery',
    deliveryMethod: 'Standard Delivery',

    items: [
      {
        id: 4,
        name: 'Colour Pencil Set',
        variant: '',
        price: 1200,
        quantity: 1,
      },
    ],
  },
];