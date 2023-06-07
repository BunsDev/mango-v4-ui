import { ThemeData } from 'types'

export const breakpoints = {
  sm: 640,
  // => @media (min-width: 640px) { ... }

  md: 768,
  // => @media (min-width: 768px) { ... }

  lg: 1024,
  // => @media (min-width: 1024px) { ... }

  xl: 1280,
  // => @media (min-width: 1280px) { ... }

  '2xl': 1536,
  // => @media (min-width: 1536px) { ... }

  '3xl': 1792,
  // => @media (min-width: 1536px) { ... }
}

type NftThemeMeta = {
  [key: string]: ThemeData
}

export const nftThemeMeta: NftThemeMeta = {
  default: {
    buttonStyle: 'flat',
    logoPath: '/logos/logo-mark.svg',
    platformName: 'Mango',
    rainAnimationImagePath: '',
    sideImagePath: '',
    sideTilePath: '',
    topTilePath: '',
    tvChartTheme: 'Dark',
    tvImagePath: '',
    useGradientBg: false,
  },
  Bonk: {
    buttonStyle: 'raised',
    logoPath: '/images/themes/bonk/bonk-logo.png',
    platformName: 'Bongo',
    rainAnimationImagePath: '/images/themes/bonk/bonk-animation-logo.png',
    sideImagePath: '/images/themes/bonk/sidenav-image.png',
    sideTilePath: '/images/themes/bonk/bonk-tile.png',
    topTilePath: '/images/themes/bonk/bonk-tile.png',
    tvChartTheme: 'Light',
    tvImagePath: '/images/themes/bonk/tv-chart-image.png',
    useGradientBg: true,
  },
}
