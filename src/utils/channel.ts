/**
 * メッセージを送信するチャンネル
 */
export class Channel {
  constructor(
    public readonly channel_a: number,
    public readonly channel_b: number,
    public readonly channel_c: number
  ) {}

  static fromTuple(tuple: [number, number, number]) {
    return new Channel(...tuple);
  }

  static fromString(str: string) {
    let [a, b, c] = str.split(".").map((s) => parseInt(s));

    if (typeof a !== "number" || isNaN(a)) {
      a = 0;
    } else if (a < 0 || a > 255) {
      a = ((a % 256) + 256) % 256;
    }

    if (typeof b !== "number" || isNaN(b)) {
      b = 0;
    } else if (b < 0 || b > 255) {
      b = ((b % 256) + 256) % 256;
    }

    if (typeof c !== "number" || isNaN(c)) {
      c = 0;
    } else if (c < 0 || c > 255) {
      c = ((c % 256) + 256) % 256;
    }

    return new Channel(a, b, c);
  }

  get tuple(): [number, number, number] {
    return [this.channel_a, this.channel_b, this.channel_c];
  }

  get color(): string {
    return `rgb(${this.tuple.join()})`;
  }

  toString() {
    return `${this.channel_a}.${this.channel_b}.${this.channel_c}`;
  }

  distance(other: Channel) {
    if (!(other instanceof Channel)) {
      throw new Error("must be a Channel instance");
    }

    return Math.sqrt(
      Math.pow(this.channel_a - other.channel_a, 2) +
        Math.pow(this.channel_b - other.channel_b, 2) +
        Math.pow(this.channel_c - other.channel_c, 2)
    );
  }
}

export const channel_for_color_names = {
  black: new Channel(0x00, 0x00, 0x00),
  aliceblue: new Channel(0xf0, 0xf8, 0xff),
  darkcyan: new Channel(0x00, 0x8b, 0x8b),
  lightyellow: new Channel(0xff, 0xff, 0xe0),
  coral: new Channel(0xff, 0x7f, 0x50),
  dimgray: new Channel(0x69, 0x69, 0x69),
  lavender: new Channel(0xe6, 0xe6, 0xfa),
  teal: new Channel(0x00, 0x80, 0x80),
  lightgoldenrodyellow: new Channel(0xfa, 0xfa, 0xd2),
  tomato: new Channel(0xff, 0x63, 0x47),
  gray: new Channel(0x80, 0x80, 0x80),
  lightsteelblue: new Channel(0xb0, 0xc4, 0xde),
  darkslategray: new Channel(0x2f, 0x4f, 0x4f),
  lemonchiffon: new Channel(0xff, 0xfa, 0xcd),
  orangered: new Channel(0xff, 0x45, 0x00),
  darkgray: new Channel(0xa9, 0xa9, 0xa9),
  lightslategray: new Channel(0x77, 0x88, 0x99),
  darkgreen: new Channel(0x00, 0x64, 0x00),
  wheat: new Channel(0xf5, 0xde, 0xb3),
  red: new Channel(0xff, 0x00, 0x00),
  silver: new Channel(0xc0, 0xc0, 0xc0),
  slategray: new Channel(0x70, 0x80, 0x90),
  green: new Channel(0x00, 0x80, 0x00),
  burlywood: new Channel(0xde, 0xb8, 0x87),
  crimson: new Channel(0xdc, 0x14, 0x3c),
  lightgray: new Channel(0xd3, 0xd3, 0xd3),
  steelblue: new Channel(0x46, 0x82, 0xb4),
  forestgreen: new Channel(0x22, 0x8b, 0x22),
  tan: new Channel(0xd2, 0xb4, 0x8c),
  mediumvioletred: new Channel(0xc7, 0x15, 0x85),
  gainsboro: new Channel(0xdc, 0xdc, 0xdc),
  royalblue: new Channel(0x41, 0x69, 0xe1),
  seagreen: new Channel(0x2e, 0x8b, 0x57),
  khaki: new Channel(0xf0, 0xe6, 0x8c),
  deeppink: new Channel(0xff, 0x14, 0x93),
  whitesmoke: new Channel(0xf5, 0xf5, 0xf5),
  midnightblue: new Channel(0x19, 0x19, 0x70),
  mediumseagreen: new Channel(0x3c, 0xb3, 0x71),
  yellow: new Channel(0xff, 0xff, 0x00),
  hotpink: new Channel(0xff, 0x69, 0xb4),
  white: new Channel(0xff, 0xff, 0xff),
  navy: new Channel(0x00, 0x00, 0x80),
  mediumaquamarine: new Channel(0x66, 0xcd, 0xaa),
  gold: new Channel(0xff, 0xd7, 0x00),
  palevioletred: new Channel(0xdb, 0x70, 0x93),
  snow: new Channel(0xff, 0xfa, 0xfa),
  darkblue: new Channel(0x00, 0x00, 0x8b),
  darkseagreen: new Channel(0x8f, 0xbc, 0x8f),
  orange: new Channel(0xff, 0xa5, 0x00),
  pink: new Channel(0xff, 0xc0, 0xcb),
  ghostwhite: new Channel(0xf8, 0xf8, 0xff),
  mediumblue: new Channel(0x00, 0x00, 0xcd),
  aquamarine: new Channel(0x7f, 0xff, 0xd4),
  sandybrown: new Channel(0xf4, 0xa4, 0x60),
  lightpink: new Channel(0xff, 0xb6, 0xc1),
  floralwhite: new Channel(0xff, 0xfa, 0xf0),
  blue: new Channel(0x00, 0x00, 0xff),
  palegreen: new Channel(0x98, 0xfb, 0x98),
  darkorange: new Channel(0xff, 0x8c, 0x00),
  thistle: new Channel(0xd8, 0xbf, 0xd8),
  linen: new Channel(0xfa, 0xf0, 0xe6),
  dodgerblue: new Channel(0x1e, 0x90, 0xff),
  lightgreen: new Channel(0x90, 0xee, 0x90),
  goldenrod: new Channel(0xda, 0xa5, 0x20),
  magenta: new Channel(0xff, 0x00, 0xff),
  antiquewhite: new Channel(0xfa, 0xeb, 0xd7),
  cornflowerblue: new Channel(0x64, 0x95, 0xed),
  springgreen: new Channel(0x00, 0xff, 0x7f),
  peru: new Channel(0xcd, 0x85, 0x3f),
  fuchsia: new Channel(0xff, 0x00, 0xff),
  papayawhip: new Channel(0xff, 0xef, 0xd5),
  deepskyblue: new Channel(0x00, 0xbf, 0xff),
  mediumspringgreen: new Channel(0x00, 0xfa, 0x9a),
  darkgoldenrod: new Channel(0xb8, 0x86, 0x0b),
  violet: new Channel(0xee, 0x82, 0xee),
  blanchedalmond: new Channel(0xff, 0xeb, 0xcd),
  lightskyblue: new Channel(0x87, 0xce, 0xfa),
  lawngreen: new Channel(0x7c, 0xfc, 0x00),
  chocolate: new Channel(0xd2, 0x69, 0x1e),
  plum: new Channel(0xdd, 0xa0, 0xdd),
  bisque: new Channel(0xff, 0xe4, 0xc4),
  skyblue: new Channel(0x87, 0xce, 0xeb),
  chartreuse: new Channel(0x7f, 0xff, 0x00),
  sienna: new Channel(0xa0, 0x52, 0x2d),
  orchid: new Channel(0xda, 0x70, 0xd6),
  moccasin: new Channel(0xff, 0xe4, 0xb5),
  lightblue: new Channel(0xad, 0xd8, 0xe6),
  greenyellow: new Channel(0xad, 0xff, 0x2f),
  saddlebrown: new Channel(0x8b, 0x45, 0x13),
  mediumorchid: new Channel(0xba, 0x55, 0xd3),
  navajowhite: new Channel(0xff, 0xde, 0xad),
  powderblue: new Channel(0xb0, 0xe0, 0xe6),
  lime: new Channel(0x00, 0xff, 0x00),
  maroon: new Channel(0x80, 0x00, 0x00),
  darkorchid: new Channel(0x99, 0x32, 0xcc),
  peachpuff: new Channel(0xff, 0xda, 0xb9),
  paleturquoise: new Channel(0xaf, 0xee, 0xee),
  limegreen: new Channel(0x32, 0xcd, 0x32),
  darkred: new Channel(0x8b, 0x00, 0x00),
  darkviolet: new Channel(0x94, 0x00, 0xd3),
  mistyrose: new Channel(0xff, 0xe4, 0xe1),
  lightcyan: new Channel(0xe0, 0xff, 0xff),
  yellowgreen: new Channel(0x9a, 0xcd, 0x32),
  brown: new Channel(0xa5, 0x2a, 0x2a),
  darkmagenta: new Channel(0x8b, 0x00, 0x8b),
  lavenderblush: new Channel(0xff, 0xf0, 0xf5),
  cyan: new Channel(0x00, 0xff, 0xff),
  darkolivegreen: new Channel(0x55, 0x6b, 0x2f),
  firebrick: new Channel(0xb2, 0x22, 0x22),
  purple: new Channel(0x80, 0x00, 0x80),
  seashell: new Channel(0xff, 0xf5, 0xee),
  aqua: new Channel(0x00, 0xff, 0xff),
  olivedrab: new Channel(0x6b, 0x8e, 0x23),
  indianred: new Channel(0xcd, 0x5c, 0x5c),
  indigo: new Channel(0x4b, 0x00, 0x82),
  oldlace: new Channel(0xfd, 0xf5, 0xe6),
  turquoise: new Channel(0x40, 0xe0, 0xd0),
  olive: new Channel(0x80, 0x80, 0x00),
  rosybrown: new Channel(0xbc, 0x8f, 0x8f),
  darkslateblue: new Channel(0x48, 0x3d, 0x8b),
  ivory: new Channel(0xff, 0xff, 0xf0),
  mediumturquoise: new Channel(0x48, 0xd1, 0xcc),
  darkkhaki: new Channel(0xbd, 0xb7, 0x6b),
  darksalmon: new Channel(0xe9, 0x96, 0x7a),
  blueviolet: new Channel(0x8a, 0x2b, 0xe2),
  honeydew: new Channel(0xf0, 0xff, 0xf0),
  darkturquoise: new Channel(0x00, 0xce, 0xd1),
  palegoldenrod: new Channel(0xee, 0xe8, 0xaa),
  lightcoral: new Channel(0xf0, 0x80, 0x80),
  mediumpurple: new Channel(0x93, 0x70, 0xdb),
  mintcream: new Channel(0xf5, 0xff, 0xfa),
  lightseagreen: new Channel(0x20, 0xb2, 0xaa),
  cornsilk: new Channel(0xff, 0xf8, 0xdc),
  salmon: new Channel(0xfa, 0x80, 0x72),
  slateblue: new Channel(0x6a, 0x5a, 0xcd),
  azure: new Channel(0xf0, 0xff, 0xff),
  cadetblue: new Channel(0x5f, 0x9e, 0xa0),
  beige: new Channel(0xf5, 0xf5, 0xdc),
  lightsalmon: new Channel(0xff, 0xa0, 0x7a),
  mediumslateblue: new Channel(0x7b, 0x68, 0xee),
} as const;

export const color_match_regexp = new RegExp(
  `\\+(?:${Object.keys(channel_for_color_names).join(
    "|"
  )}|[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3})`
);
