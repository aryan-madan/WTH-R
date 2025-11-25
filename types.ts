export interface Weather {
  current: {
    temp: number;
    code: number;
    day: number;
    wind: number;
  };
}

export interface Place {
  lat: number;
  lon: number;
  name: string;
  admin?: string;
  country?: string;
}

export interface Msg {
  head: string;
  sub: string;
}

export interface Content {
  main: string;
  outline: string;
  sub: string;
}

export interface Report {
  current: {
    temp: number;
    code: number;
    day: number;
    wind: number;
  };
}

export interface Coords {
  lat: number;
  lon: number;
  city?: string;
}