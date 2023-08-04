import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  Dispatch,
  SetStateAction,
  useLayoutEffect,
} from 'react'
import { ArrowDownIcon, ArrowsRightLeftIcon } from '@heroicons/react/20/solid'
import NumberFormat, {
  NumberFormatValues,
  SourceInfo,
} from 'react-number-format'
import Decimal from 'decimal.js'
import mangoStore from '@store/mangoStore'
import { useTranslation } from 'next-i18next'
import {
  SIZE_INPUT_UI_KEY,
  SWAP_CHART_SETTINGS_KEY,
} from '../../utils/constants'
import useLocalStorageState from 'hooks/useLocalStorageState'
import SwapSlider from './SwapSlider'
import PercentageSelectButtons from './PercentageSelectButtons'
import { floorToDecimal } from 'utils/numbers'
import { withValueLimit } from './MarketSwapForm'
import SellTokenInput from './SellTokenInput'
import BuyTokenInput from './BuyTokenInput'
import { notify } from 'utils/notifications'
import * as sentry from '@sentry/nextjs'
import { SwapChartSettings, isMangoError } from 'types'
import Button, { IconButton } from '@components/shared/Button'
import Loading from '@components/shared/Loading'
import TokenLogo from '@components/shared/TokenLogo'
import InlineNotification from '@components/shared/InlineNotification'
import { handleFlipPrices } from './SwapTokenChart'
import Select from '@components/forms/Select'
import useIpAddress from 'hooks/useIpAddress'
import { Bank } from '@blockworks-foundation/mango-v4'

type LimitSwapFormProps = {
  showTokenSelect: 'input' | 'output' | undefined
  setShowTokenSelect: Dispatch<SetStateAction<'input' | 'output' | undefined>>
}

type LimitSwapForm = {
  amountIn: number
  hasBorrows: number | undefined
  triggerPrice: string
}

type FormErrors = Partial<Record<keyof LimitSwapForm, string>>

type OrderTypeMultiplier = 0.9 | 1 | 1.1

enum OrderTypes {
  STOP_LOSS = 'trade:stop-loss',
  TAKE_PROFIT = 'trade:take-profit',
  REPAY_BORROW = 'repay-borrow',
}

const ORDER_TYPES = [
  OrderTypes.STOP_LOSS,
  OrderTypes.TAKE_PROFIT,
  OrderTypes.REPAY_BORROW,
]

const set = mangoStore.getState().set

const getSellTokenBalance = (inputBank: Bank | undefined) => {
  const mangoAccount = mangoStore.getState().mangoAccount.current
  if (!inputBank || !mangoAccount) return 0
  const balance = mangoAccount.getTokenBalanceUi(inputBank)
  return balance
}

const getOrderTypeMultiplier = (orderType: OrderTypes, flipPrices: boolean) => {
  if (orderType === OrderTypes.STOP_LOSS) {
    return flipPrices ? 0.9 : 1.1
  } else if (orderType === OrderTypes.TAKE_PROFIT) {
    return flipPrices ? 1.1 : 0.9
  } else {
    return 1
  }
}

const LimitSwapForm = ({
  showTokenSelect,
  setShowTokenSelect,
}: LimitSwapFormProps) => {
  const { t } = useTranslation(['common', 'swap', 'trade'])
  const { ipAllowed, ipCountry } = useIpAddress()
  const [animateSwitchArrow, setAnimateSwitchArrow] = useState(0)
  const [triggerPrice, setTriggerPrice] = useState('')
  const [orderType, setOrderType] = useState(ORDER_TYPES[0])
  const [orderTypeMultiplier, setOrderTypeMultiplier] =
    useState<OrderTypeMultiplier | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [swapFormSizeUi] = useLocalStorageState(SIZE_INPUT_UI_KEY, 'slider')
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [swapChartSettings, setSwapChartSettings] = useLocalStorageState(
    SWAP_CHART_SETTINGS_KEY,
    [],
  )

  const {
    inputBank,
    outputBank,
    amountIn: amountInFormValue,
    amountOut: amountOutFormValue,
    limitPrice,
  } = mangoStore((s) => s.swap)

  const amountInAsDecimal: Decimal | null = useMemo(() => {
    return Number(amountInFormValue)
      ? new Decimal(amountInFormValue)
      : new Decimal(0)
  }, [amountInFormValue])

  const flipPrices = useMemo(() => {
    if (!swapChartSettings.length || !inputBank || !outputBank) return false
    const pairSettings = swapChartSettings.find(
      (chart: SwapChartSettings) =>
        chart.pair.includes(inputBank.name) &&
        chart.pair.includes(outputBank.name),
    )
    if (pairSettings) {
      return pairSettings.flipPrices
    } else return false
  }, [swapChartSettings, inputBank, outputBank])

  const setAmountInFormValue = useCallback((amountIn: string) => {
    set((s) => {
      s.swap.amountIn = amountIn
      if (!parseFloat(amountIn)) {
        s.swap.amountOut = ''
      }
    })
  }, [])

  const setAmountOutFormValue = useCallback((amountOut: string) => {
    set((s) => {
      s.swap.amountOut = amountOut
      if (!parseFloat(amountOut)) {
        s.swap.amountIn = ''
      }
    })
  }, [])

  const quotePrice = useMemo(() => {
    if (!inputBank || !outputBank) return 0
    const quote = !flipPrices
      ? floorToDecimal(
          outputBank.uiPrice / inputBank.uiPrice,
          inputBank.mintDecimals,
        ).toNumber()
      : floorToDecimal(
          inputBank.uiPrice / outputBank.uiPrice,
          outputBank.mintDecimals,
        ).toNumber()
    return quote
  }, [flipPrices, inputBank, outputBank])

  // set default trigger price
  useEffect(() => {
    if (!quotePrice || triggerPrice || showTokenSelect) return
    const multiplier = getOrderTypeMultiplier(OrderTypes.STOP_LOSS, flipPrices)
    const decimals = !flipPrices
      ? inputBank?.mintDecimals
      : outputBank?.mintDecimals
    setTriggerPrice((quotePrice * multiplier).toFixed(decimals))
  }, [
    flipPrices,
    inputBank,
    outputBank,
    quotePrice,
    showTokenSelect,
    triggerPrice,
  ])

  // flip trigger price and set amount out when chart direction is flipped
  useLayoutEffect(() => {
    if (!quotePrice) return
    const multiplier = getOrderTypeMultiplier(orderType, flipPrices)
    const decimals = flipPrices
      ? outputBank?.mintDecimals
      : inputBank?.mintDecimals
    const price = (quotePrice * multiplier).toFixed(decimals)
    setTriggerPrice(price)
    if (amountInAsDecimal?.gt(0)) {
      const amountOut = getAmountOut(amountInAsDecimal.toString(), price)
      setAmountOutFormValue(amountOut.toString())
    }
  }, [flipPrices])

  const triggerPriceDifference = useMemo(() => {
    if (!quotePrice) return 0
    const triggerDifference = triggerPrice
      ? ((parseFloat(triggerPrice) - quotePrice) / quotePrice) * 100
      : 0
    return triggerDifference
  }, [flipPrices, quotePrice, triggerPrice])

  const handleTokenSelect = (type: 'input' | 'output') => {
    setShowTokenSelect(type)
    setTriggerPrice('')
  }

  const hasBorrowToRepay = useMemo(() => {
    const mangoAccount = mangoStore.getState().mangoAccount.current
    if (orderType !== OrderTypes.REPAY_BORROW || !outputBank || !mangoAccount)
      return
    const borrow = mangoAccount.getTokenBorrowsUi(outputBank)
    return borrow
  }, [orderType, outputBank])

  const isFormValid = useCallback(
    (form: LimitSwapForm) => {
      const invalidFields: FormErrors = {}
      setFormErrors({})
      const requiredFields: (keyof LimitSwapForm)[] = [
        'amountIn',
        'triggerPrice',
      ]
      const triggerPriceNumber = parseFloat(form.triggerPrice)
      const sellTokenBalance = getSellTokenBalance(inputBank)
      for (const key of requiredFields) {
        const value = form[key] as string
        if (!value) {
          invalidFields[key] = t('settings:error-required-field')
        }
      }
      if (orderType === OrderTypes.STOP_LOSS) {
        if (!flipPrices && triggerPriceNumber <= quotePrice) {
          invalidFields.triggerPrice =
            'Trigger price must be above oracle price'
        }
        if (flipPrices && triggerPriceNumber >= quotePrice) {
          invalidFields.triggerPrice =
            'Trigger price must be below oracle price'
        }
      }
      if (orderType === OrderTypes.TAKE_PROFIT) {
        if (!flipPrices && triggerPriceNumber >= quotePrice) {
          invalidFields.triggerPrice =
            'Trigger price must be below oracle price'
        }
        if (flipPrices && triggerPriceNumber <= quotePrice) {
          invalidFields.triggerPrice =
            'Trigger price must be above oracle price'
        }
      }
      if (orderType === OrderTypes.REPAY_BORROW && !hasBorrowToRepay) {
        invalidFields.hasBorrows = t('swap:no-borrow')
      }
      if (form.amountIn > sellTokenBalance) {
        invalidFields.amountIn = t('swap:insufficient-balance', {
          symbol: inputBank?.name,
        })
      }
      if (Object.keys(invalidFields).length) {
        setFormErrors(invalidFields)
      }
      return invalidFields
    },
    [
      flipPrices,
      hasBorrowToRepay,
      inputBank,
      orderType,
      quotePrice,
      setFormErrors,
    ],
  )

  // set order type multiplier on page load
  useEffect(() => {
    if (!orderTypeMultiplier) {
      const multiplier = getOrderTypeMultiplier(orderType, flipPrices)
      setOrderTypeMultiplier(multiplier)
    }
  }, [flipPrices, orderType, orderTypeMultiplier])

  // get the out amount from the in amount and trigger or limit price
  const getAmountOut = useCallback(
    (amountIn: string, price: string) => {
      const amountOut = !flipPrices
        ? floorToDecimal(
            parseFloat(amountIn) / parseFloat(price),
            outputBank?.mintDecimals || 0,
          )
        : floorToDecimal(
            parseFloat(amountIn) * parseFloat(price),
            outputBank?.mintDecimals || 0,
          )
      return amountOut
    },
    [outputBank, flipPrices],
  )

  // get the in amount from the out amount and trigger or limit price
  const getAmountIn = useCallback(
    (amountOut: string, price: string) => {
      const amountIn = !flipPrices
        ? floorToDecimal(
            parseFloat(amountOut) * parseFloat(price),
            inputBank?.mintDecimals || 0,
          )
        : floorToDecimal(
            parseFloat(amountOut) / parseFloat(price),
            inputBank?.mintDecimals || 0,
          )
      return amountIn
    },
    [inputBank, outputBank, flipPrices],
  )

  const handleMax = useCallback(
    (amountIn: string) => {
      setAmountInFormValue(amountIn)
      if (parseFloat(amountIn) > 0 && triggerPrice) {
        const amountOut = getAmountOut(amountIn, triggerPrice)
        setAmountOutFormValue(amountOut.toString())
      }
    },
    [getAmountOut, setAmountInFormValue, setAmountOutFormValue, triggerPrice],
  )

  const handleRepay = useCallback(
    (amountOut: string) => {
      setAmountOutFormValue(amountOut)
      if (parseFloat(amountOut) > 0 && triggerPrice) {
        const amountIn = getAmountIn(amountOut, triggerPrice)
        setAmountInFormValue(amountIn.toString())
      }
    },
    [getAmountIn, setAmountInFormValue, setAmountOutFormValue, triggerPrice],
  )

  const handleAmountInChange = useCallback(
    (e: NumberFormatValues, info: SourceInfo) => {
      if (info.source !== 'event') return
      setFormErrors({})
      setAmountInFormValue(e.value)
      if (parseFloat(e.value) > 0 && triggerPrice) {
        const amountOut = getAmountOut(e.value, triggerPrice)
        setAmountOutFormValue(amountOut.toString())
      }
    },
    [
      getAmountOut,
      setAmountInFormValue,
      setAmountOutFormValue,
      setFormErrors,
      triggerPrice,
    ],
  )

  const handleAmountOutChange = useCallback(
    (e: NumberFormatValues, info: SourceInfo) => {
      if (info.source !== 'event') return
      setFormErrors({})
      setAmountOutFormValue(e.value)
      if (parseFloat(e.value) > 0 && triggerPrice) {
        const amountIn = getAmountIn(e.value, triggerPrice)
        setAmountInFormValue(amountIn.toString())
      }
    },
    [
      getAmountIn,
      setAmountInFormValue,
      setAmountOutFormValue,
      setFormErrors,
      triggerPrice,
    ],
  )

  const handleAmountInUi = useCallback(
    (amountIn: string) => {
      setAmountInFormValue(amountIn)
      setFormErrors({})
      if (triggerPrice) {
        const amountOut = getAmountOut(amountIn, triggerPrice)
        setAmountOutFormValue(amountOut.toString())
      }
    },
    [
      getAmountOut,
      setAmountInFormValue,
      setAmountOutFormValue,
      setFormErrors,
      triggerPrice,
    ],
  )

  const handleTriggerPrice = useCallback(
    (e: NumberFormatValues, info: SourceInfo) => {
      if (info.source !== 'event') return
      setFormErrors({})
      setTriggerPrice(e.value)
      if (parseFloat(e.value) > 0 && parseFloat(amountInFormValue) > 0) {
        const amountOut = getAmountOut(amountInFormValue, e.value)
        setAmountOutFormValue(amountOut.toString())
      }
    },
    [amountInFormValue, flipPrices, setFormErrors, setTriggerPrice],
  )

  const handleSwitchTokens = useCallback(() => {
    if (!inputBank || !outputBank) return
    setFormErrors({})
    set((s) => {
      s.swap.inputBank = outputBank
      s.swap.outputBank = inputBank
    })
    const multiplier = getOrderTypeMultiplier(orderType, flipPrices)
    const price = !flipPrices
      ? floorToDecimal(
          (inputBank.uiPrice / outputBank.uiPrice) * multiplier,
          outputBank.mintDecimals,
        ).toString()
      : floorToDecimal(
          (outputBank.uiPrice / inputBank.uiPrice) * multiplier,
          inputBank.mintDecimals,
        ).toString()
    setTriggerPrice(price)

    if (amountInAsDecimal?.gt(0)) {
      const amountOut = getAmountOut(amountInAsDecimal.toString(), price)
      setAmountOutFormValue(amountOut.toString())
    }
    setAnimateSwitchArrow(
      (prevanimateSwitchArrow) => prevanimateSwitchArrow + 1,
    )
  }, [
    amountInAsDecimal,
    flipPrices,
    inputBank,
    orderType,
    outputBank,
    setAmountInFormValue,
    setFormErrors,
    triggerPrice,
  ])

  const handlePlaceStopLoss = useCallback(async () => {
    const invalidFields = isFormValid({
      amountIn: amountInAsDecimal.toNumber(),
      hasBorrows: hasBorrowToRepay,
      triggerPrice,
    })
    if (Object.keys(invalidFields).length) {
      return
    }
    try {
      const client = mangoStore.getState().client
      const group = mangoStore.getState().group
      const actions = mangoStore.getState().actions
      const mangoAccount = mangoStore.getState().mangoAccount.current
      const inputBank = mangoStore.getState().swap.inputBank
      const outputBank = mangoStore.getState().swap.outputBank

      if (!mangoAccount || !group || !inputBank || !outputBank || !triggerPrice)
        return
      setSubmitting(true)

      const inputMint = inputBank.mint
      const outputMint = outputBank.mint
      const amountIn = amountInAsDecimal.toNumber()

      try {
        const tx = await client.tokenConditionalSwapStopLoss(
          group,
          mangoAccount,
          inputMint,
          parseFloat(triggerPrice),
          outputMint,
          null,
          amountIn,
          null,
          null,
        )
        notify({
          title: 'Transaction confirmed',
          type: 'success',
          txid: tx,
          noSound: true,
        })
        actions.fetchGroup()
        await actions.reloadMangoAccount()
      } catch (e) {
        console.error('onSwap error: ', e)
        sentry.captureException(e)
        if (isMangoError(e)) {
          notify({
            title: 'Transaction failed',
            description: e.message,
            txid: e?.txid,
            type: 'error',
          })
        }
      }
    } catch (e) {
      console.error('Swap error:', e)
    } finally {
      setSubmitting(false)
    }
  }, [
    hasBorrowToRepay,
    flipPrices,
    limitPrice,
    triggerPrice,
    amountInAsDecimal,
    amountOutFormValue,
  ])

  const orderDescription = useMemo(() => {
    if (
      !amountInFormValue ||
      !amountOutFormValue ||
      !inputBank ||
      !outputBank ||
      !triggerPrice
    )
      return

    const quoteString = !flipPrices
      ? `${inputBank.name} per ${outputBank.name}`
      : `${outputBank.name} per ${inputBank.name}`

    const orderTypeString =
      orderType === OrderTypes.STOP_LOSS
        ? t('trade:falls-to')
        : t('trade:rises-to')

    if (orderType === OrderTypes.REPAY_BORROW) {
      return t('trade:repay-borrow-order-desc', {
        amount: floorToDecimal(amountOutFormValue, outputBank.mintDecimals),
        priceUnit: quoteString,
        symbol: outputBank.name,
        triggerPrice: floorToDecimal(triggerPrice, inputBank.mintDecimals),
      })
    } else if (inputBank.name === 'USDC') {
      return t('trade:trigger-order-desc', {
        amount: floorToDecimal(amountOutFormValue, outputBank.mintDecimals),
        orderType: orderTypeString,
        priceUnit: quoteString,
        symbol: outputBank.name,
        triggerPrice: floorToDecimal(triggerPrice, inputBank.mintDecimals),
      })
    } else {
      return t('trade:trigger-order-desc', {
        amount: floorToDecimal(amountInFormValue, inputBank.mintDecimals),
        orderType: orderTypeString,
        priceUnit: quoteString,
        symbol: inputBank.name,
        triggerPrice: floorToDecimal(triggerPrice, inputBank.mintDecimals),
      })
    }
  }, [
    amountInFormValue,
    amountOutFormValue,
    flipPrices,
    inputBank,
    orderType,
    outputBank,
    triggerPrice,
  ])

  const triggerPriceSuffix = useMemo(() => {
    if (!inputBank || !outputBank) return
    if (!flipPrices) {
      return `${inputBank.name} per ${outputBank.name}`
    } else {
      return `${outputBank.name} per ${inputBank.name}`
    }
  }, [flipPrices, inputBank, outputBank])

  const toggleFlipPrices = useCallback(
    (flip: boolean) => {
      if (!inputBank || !outputBank) return
      setFormErrors({})
      handleFlipPrices(
        flip,
        inputBank.name,
        outputBank.name,
        swapChartSettings,
        setSwapChartSettings,
      )
    },
    [
      getOrderTypeMultiplier,
      inputBank,
      orderType,
      outputBank,
      setFormErrors,
      setSwapChartSettings,
      swapChartSettings,
    ],
  )

  const handleOrderTypeChange = useCallback(
    (type: string) => {
      setFormErrors({})
      const newType = type as OrderTypes
      setOrderType(newType)
      const triggerMultiplier = getOrderTypeMultiplier(newType, flipPrices)
      setOrderTypeMultiplier(triggerMultiplier)
      const trigger = (quotePrice * triggerMultiplier).toString()
      setTriggerPrice(trigger)
      if (amountInAsDecimal.gt(0)) {
        const amountOut = getAmountOut(
          amountInAsDecimal.toString(),
          trigger,
        ).toString()
        setAmountOutFormValue(amountOut)
      }
    },
    [flipPrices, quotePrice, setFormErrors, setOrderTypeMultiplier],
  )

  // const disablePlaceOrder =
  //   (orderType === OrderTypes.REPAY_BORROW && !hasBorrowToRepay) ||
  //   (orderType === OrderTypes.STOP_LOSS &&
  //     parseFloat(triggerPrice) > quotePrice) ||
  //   (orderType === OrderTypes.TAKE_PROFIT &&
  //     parseFloat(triggerPrice) < quotePrice) ||
  //   amountInAsDecimal.gt(sellTokenBalance)

  return (
    <>
      <SellTokenInput
        className="rounded-b-none"
        error={formErrors.amountIn}
        handleAmountInChange={handleAmountInChange}
        setShowTokenSelect={() => handleTokenSelect('input')}
        handleMax={handleMax}
        isTriggerOrder
      />
      <div
        className={`grid grid-cols-2 gap-2 rounded-b-xl bg-th-bkg-2 p-3 pt-1`}
        id="swap-step-two"
      >
        <div className="col-span-1">
          <p className="mb-2 text-th-fgd-2">{t('trade:order-type')}</p>
          <Select
            value={t(orderType)}
            onChange={(type) => handleOrderTypeChange(type)}
            className="w-full"
            buttonClassName="ring-transparent rounded-t-lg rounded-b-lg focus:outline-none md:hover:bg-th-bkg-1 md:hover:ring-transparent focus-visible:bg-th-bkg-3 whitespace-nowrap"
          >
            {ORDER_TYPES.map((type) => (
              <Select.Option key={type} value={type}>
                {t(type)}
              </Select.Option>
            ))}
          </Select>
        </div>
        <div className="col-span-1">
          <div className="flex items-center justify-between">
            <p className="mb-2 text-th-fgd-2">{t('trade:trigger-price')}</p>
            <IconButton hideBg onClick={() => toggleFlipPrices(!flipPrices)}>
              <ArrowsRightLeftIcon className="h-4 w-4" />
            </IconButton>
          </div>
          <div className="flex items-center">
            <div className="relative w-full">
              <NumberFormat
                inputMode="decimal"
                thousandSeparator=","
                allowNegative={false}
                isNumericString={true}
                decimalScale={
                  !flipPrices
                    ? inputBank?.mintDecimals
                    : outputBank?.mintDecimals || 6
                }
                name="triggerPrice"
                id="triggerPrice"
                className="h-10 w-full rounded-lg bg-th-input-bkg p-3 pl-8 font-mono text-sm text-th-fgd-1 focus:outline-none md:hover:bg-th-bkg-1"
                placeholder="0.00"
                value={triggerPrice}
                onValueChange={handleTriggerPrice}
                isAllowed={withValueLimit}
              />
              <div className="absolute top-1/2 -translate-y-1/2 left-2">
                <TokenLogo
                  bank={flipPrices ? outputBank : inputBank}
                  size={16}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-between text-xxs text-th-fgd-4">
            <span
              className={
                triggerPriceDifference >= 0 ? 'text-th-up' : 'text-th-down'
              }
            >
              {triggerPriceDifference
                ? triggerPriceDifference.toFixed(2)
                : '0.00'}
              %
            </span>
            <span>{triggerPriceSuffix}</span>
          </div>
        </div>
        {formErrors.triggerPrice ? (
          <div className="col-span-2 flex justify-center">
            <InlineNotification
              type="error"
              desc={formErrors.triggerPrice}
              hideBorder
              hidePadding
            />
          </div>
        ) : null}
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
        error={formErrors.hasBorrows}
        handleAmountOutChange={handleAmountOutChange}
        setShowTokenSelect={() => handleTokenSelect('output')}
        handleRepay={handleRepay}
      />
      {swapFormSizeUi === 'slider' ? (
        <SwapSlider
          useMargin={false}
          amount={amountInAsDecimal.toNumber()}
          onChange={(v) => handleAmountInUi(v)}
          step={1 / 10 ** (inputBank?.mintDecimals || 6)}
        />
      ) : (
        <PercentageSelectButtons
          amountIn={amountInAsDecimal.toString()}
          setAmountIn={(v) => handleAmountInUi(v)}
          useMargin={false}
        />
      )}
      {orderType === OrderTypes.REPAY_BORROW &&
      !hasBorrowToRepay ? null : orderDescription ? (
        <div className="mt-4">
          <InlineNotification
            desc={
              <>
                {orderType !== OrderTypes.REPAY_BORROW ? (
                  inputBank?.name === 'USDC' ? (
                    <span className="text-th-up">{t('buy')}</span>
                  ) : (
                    <span className="text-th-down">{t('sell')}</span>
                  )
                ) : null}{' '}
                {orderDescription}
              </>
            }
            type="info"
          />
        </div>
      ) : null}
      {ipAllowed ? (
        <Button
          onClick={handlePlaceStopLoss}
          className="mt-6 mb-4 flex w-full items-center justify-center text-base"
          size="large"
        >
          {submitting ? <Loading /> : t('swap:place-limit-order')}
        </Button>
      ) : (
        <Button
          disabled
          className="mt-6 mb-4 w-full leading-tight"
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

export default LimitSwapForm
