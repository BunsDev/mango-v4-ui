import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  Dispatch,
  SetStateAction,
} from 'react'
import { ArrowDownIcon } from '@heroicons/react/20/solid'
import { NumberFormatValues, SourceInfo } from 'react-number-format'
import Decimal from 'decimal.js'
import mangoStore from '@store/mangoStore'
import useDebounce from '../shared/useDebounce'
import { MANGO_MINT, SIZE_INPUT_UI_KEY, USDC_MINT } from '../../utils/constants'
import { useWallet } from '@solana/wallet-adapter-react'
import { RouteInfo } from 'types/jupiter'
import useLocalStorageState from 'hooks/useLocalStorageState'
import { DEFAULT_PERCENTAGE_VALUES } from './PercentageSelectButtons'
import BuyTokenInput from './BuyTokenInput'
import Button from '@components/shared/Button'
import SwapReviewRouteInfo from './SwapReviewRouteInfo'
import useIpAddress from 'hooks/useIpAddress'
import { useTranslation } from 'react-i18next'
import useQuoteRoutes from './useQuoteRoutes'
import Loading from '@components/shared/Loading'
import InlineNotification from '@components/shared/InlineNotification'
import SecondaryConnectButton from '@components/shared/SecondaryConnectButton'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { floorToDecimal } from 'utils/numbers'
import { SwapFormTokenListType } from './SwapFormTokenList'
import WalletSellTokenInput from './WalletSellTokenInput'
import { walletBalanceForToken } from '@components/DepositForm'
import WalletSwapSlider from './WalletSwapSlider'
import ButtonGroup from '@components/forms/ButtonGroup'

dayjs.extend(relativeTime)

type WalletSwapFormProps = {
  setShowTokenSelect: Dispatch<SetStateAction<SwapFormTokenListType>>
}

const set = mangoStore.getState().set

const WalletSwapForm = ({ setShowTokenSelect }: WalletSwapFormProps) => {
  const { t } = useTranslation(['common', 'swap', 'trade'])
  //initial state is undefined null is returned on error
  const [selectedRoute, setSelectedRoute] = useState<RouteInfo | null>()
  const [animateSwitchArrow, setAnimateSwitchArrow] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [sizePercentage, setSizePercentage] = useState('')
  const [swapFormSizeUi] = useLocalStorageState(SIZE_INPUT_UI_KEY, 'slider')
  const {
    margin: useMargin,
    slippage,
    inputBank,
    outputBank,
    amountIn: amountInFormValue,
    amountOut: amountOutFormValue,
    swapMode,
  } = mangoStore((s) => s.swap)
  const [debouncedAmountIn] = useDebounce(amountInFormValue, 300)
  const [debouncedAmountOut] = useDebounce(amountOutFormValue, 300)
  const { connected, publicKey } = useWallet()
  const { bestRoute, routes } = useQuoteRoutes({
    inputMint: inputBank?.mint.toString() || USDC_MINT,
    outputMint: outputBank?.mint.toString() || MANGO_MINT,
    amount: swapMode === 'ExactIn' ? debouncedAmountIn : debouncedAmountOut,
    slippage,
    swapMode,
    wallet: publicKey?.toBase58(),
    mode: 'JUPITER',
  })
  const { ipAllowed, ipCountry } = useIpAddress()

  const walletTokens = mangoStore((s) => s.wallet.tokens)

  const [walletMax, inputDecimals] = useMemo(() => {
    if (!inputBank) return ['0', 6]
    const walletBalance = walletBalanceForToken(walletTokens, inputBank.name)
    const max = floorToDecimal(
      walletBalance.maxAmount,
      walletBalance.maxDecimals,
    ).toFixed()
    return [max, walletBalance.maxDecimals]
  }, [walletTokens, inputBank])

  const amountInAsDecimal: Decimal | null = useMemo(() => {
    return Number(debouncedAmountIn)
      ? new Decimal(debouncedAmountIn)
      : new Decimal(0)
  }, [debouncedAmountIn])

  const amountOutAsDecimal: Decimal | null = useMemo(() => {
    return Number(debouncedAmountOut)
      ? new Decimal(debouncedAmountOut)
      : new Decimal(0)
  }, [debouncedAmountOut])

  const setAmountInFormValue = useCallback(
    (amountIn: string, setSwapMode?: boolean) => {
      set((s) => {
        s.swap.amountIn = amountIn
        if (!parseFloat(amountIn)) {
          s.swap.amountOut = ''
        }
        if (setSwapMode) {
          s.swap.swapMode = 'ExactIn'
        }
      })
    },
    [],
  )

  const setAmountOutFormValue = useCallback(
    (amountOut: string, setSwapMode?: boolean) => {
      set((s) => {
        s.swap.amountOut = amountOut
        if (!parseFloat(amountOut)) {
          s.swap.amountIn = ''
        }
        if (setSwapMode) {
          s.swap.swapMode = 'ExactOut'
        }
      })
    },
    [],
  )

  const handleAmountInChange = useCallback(
    (e: NumberFormatValues, info: SourceInfo) => {
      if (info.source !== 'event') return
      setAmountInFormValue(e.value)
      if (swapMode === 'ExactOut') {
        set((s) => {
          s.swap.swapMode = 'ExactIn'
        })
      }
    },
    [outputBank, setAmountInFormValue, swapMode],
  )

  const handleAmountOutChange = useCallback(
    (e: NumberFormatValues, info: SourceInfo) => {
      if (info.source !== 'event') return
      if (swapMode === 'ExactIn') {
        set((s) => {
          s.swap.swapMode = 'ExactOut'
        })
      }
      setAmountOutFormValue(e.value)
    },
    [swapMode, setAmountOutFormValue],
  )

  const handleMax = useCallback(
    (amountIn: string) => {
      setAmountInFormValue(amountIn, true)
    },
    [setAmountInFormValue],
  )

  /* 
    Once a route is returned from the Jupiter API, use the inAmount or outAmount
    depending on the swapMode and set those values in state
  */
  useEffect(() => {
    if (typeof bestRoute !== 'undefined') {
      setSelectedRoute(bestRoute)

      if (inputBank && swapMode === 'ExactOut' && bestRoute) {
        const inAmount = new Decimal(bestRoute!.inAmount)
          .div(10 ** inputBank.mintDecimals)
          .toString()
        setAmountInFormValue(inAmount)
      } else if (outputBank && swapMode === 'ExactIn' && bestRoute) {
        const outAmount = new Decimal(bestRoute!.outAmount)
          .div(10 ** outputBank.mintDecimals)
          .toString()
        setAmountOutFormValue(outAmount)
      }
    }
  }, [bestRoute, swapMode, inputBank, outputBank])

  const handleSwitchTokens = useCallback(() => {
    if (amountInAsDecimal?.gt(0) && amountOutAsDecimal.gte(0)) {
      setAmountInFormValue(amountOutAsDecimal.toString())
    }
    const inputBank = mangoStore.getState().swap.inputBank
    const outputBank = mangoStore.getState().swap.outputBank
    set((s) => {
      s.swap.inputBank = outputBank
      s.swap.outputBank = inputBank
    })
    setAnimateSwitchArrow(
      (prevanimateSwitchArrow) => prevanimateSwitchArrow + 1,
    )
  }, [setAmountInFormValue, amountOutAsDecimal, amountInAsDecimal])

  const loadingSwapDetails: boolean = useMemo(() => {
    return (
      !!(amountInAsDecimal.toNumber() || amountOutAsDecimal.toNumber()) &&
      connected &&
      typeof selectedRoute === 'undefined'
    )
  }, [amountInAsDecimal, amountOutAsDecimal, connected, selectedRoute])

  const handleSizePercentage = (percentage: string) => {
    setSizePercentage(percentage)
    const walletMaxDecimal = new Decimal(walletMax)
    if (walletMaxDecimal.gt(0)) {
      let amount = walletMaxDecimal.mul(percentage).div(100)
      if (percentage !== '100') {
        amount = floorToDecimal(amount, inputDecimals)
      }
      setAmountInFormValue(amount.toFixed())
    } else {
      setAmountInFormValue('0')
    }
  }

  return (
    <>
      <SwapReviewRouteInfo
        amountIn={amountInAsDecimal}
        isWalletSwap
        onClose={() => setShowConfirm(false)}
        routes={routes}
        selectedRoute={selectedRoute}
        setSelectedRoute={setSelectedRoute}
        show={showConfirm}
        slippage={slippage}
      />
      <WalletSellTokenInput
        handleAmountInChange={handleAmountInChange}
        setShowTokenSelect={setShowTokenSelect}
        handleMax={handleMax}
        max={walletMax}
      />
      <div className="rounded-b-xl bg-th-bkg-2 p-3 pt-0">
        {swapFormSizeUi === 'slider' ? (
          <WalletSwapSlider
            amount={amountInAsDecimal.toNumber()}
            onChange={(v) => setAmountInFormValue(v, true)}
            step={1 / 10 ** (inputBank?.mintDecimals || 6)}
            maxAmount={parseFloat(walletMax)}
          />
        ) : (
          <div className="col-span-2">
            <ButtonGroup
              activeValue={sizePercentage}
              onChange={(p) => handleSizePercentage(p)}
              values={DEFAULT_PERCENTAGE_VALUES}
              unit="%"
            />
          </div>
        )}
      </div>
      <div className="my-2 flex justify-center">
        <button
          className="rounded-full border border-th-fgd-4 p-1.5 text-th-fgd-3 focus-visible:border-th-active md:hover:border-th-active md:hover:text-th-active"
          onClick={handleSwitchTokens}
        >
          <ArrowDownIcon
            className="h-5 w-5"
            style={
              animateSwitchArrow % 2 == 0
                ? { transform: 'rotate(0deg)' }
                : { transform: 'rotate(360deg)' }
            }
          />
        </button>
      </div>
      <BuyTokenInput
        handleAmountOutChange={handleAmountOutChange}
        loading={loadingSwapDetails}
        setShowTokenSelect={setShowTokenSelect}
      />
      {ipAllowed ? (
        <SwapFormSubmitButton
          loadingSwapDetails={loadingSwapDetails}
          useMargin={useMargin}
          selectedRoute={selectedRoute}
          setShowConfirm={setShowConfirm}
          amountIn={amountInAsDecimal}
          inputSymbol={inputBank?.name}
          amountOut={selectedRoute ? amountOutAsDecimal.toNumber() : undefined}
        />
      ) : (
        <Button
          disabled
          className="mb-4 mt-6 flex w-full items-center justify-center text-base"
          size="large"
        >
          {t('country-not-allowed', {
            country: ipCountry ? `(${ipCountry})` : '',
          })}
        </Button>
      )}
    </>
  )
}

export default WalletSwapForm

const SwapFormSubmitButton = ({
  amountIn,
  amountOut,
  loadingSwapDetails,
  selectedRoute,
  setShowConfirm,
}: {
  amountIn: Decimal
  amountOut: number | undefined
  inputSymbol: string | undefined
  loadingSwapDetails: boolean
  selectedRoute: RouteInfo | undefined | null
  setShowConfirm: (x: boolean) => void
  useMargin: boolean
}) => {
  const { t } = useTranslation('common')
  const { connected } = useWallet()

  const disabled =
    (connected && !amountIn.toNumber()) || !amountOut || !selectedRoute

  return (
    <>
      {connected ? (
        <Button
          onClick={() => setShowConfirm(true)}
          className="mb-4 mt-6 flex w-full items-center justify-center text-base"
          disabled={disabled}
          size="large"
        >
          {loadingSwapDetails ? (
            <Loading />
          ) : (
            <span>{t('swap:review-swap')}</span>
          )}
        </Button>
      ) : (
        <SecondaryConnectButton
          className="mb-4 mt-6 flex w-full items-center justify-center"
          isLarge
        />
      )}
      {selectedRoute === null && amountIn.gt(0) ? (
        <div className="mb-4">
          <InlineNotification type="error" desc={t('swap:no-swap-found')} />
        </div>
      ) : null}
    </>
  )
}