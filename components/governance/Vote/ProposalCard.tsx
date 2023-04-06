import {
  ProgramAccount,
  Proposal,
  VoteKind,
  VoteRecord,
  getGovernanceAccount,
  getVoteRecordAddress,
} from '@solana/spl-governance'
import { VoteCountdown } from './VoteCountdown'
import { MintInfo } from '@solana/spl-token'
import VoteResults from './VoteResult'
import QuorumProgress from './VoteProgress'
import GovernanceStore from '@store/governanceStore'
import Button from '@components/shared/Button'
import {
  ArrowTopRightOnSquareIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
} from '@heroicons/react/20/solid'
import { BN } from '@project-serum/anchor'
import { useEffect, useState } from 'react'
import { MANGO_GOVERNANCE_PROGRAM } from 'utils/governance/constants'
import mangoStore from '@store/mangoStore'
import { castVote } from 'utils/governance/instructions/castVote'
import { useWallet } from '@solana/wallet-adapter-react'
import { relinquishVote } from 'utils/governance/instructions/relinquishVote'
import { PublicKey } from '@solana/web3.js'
import { notify } from 'utils/notifications'
import Loading from '@components/shared/Loading'

enum PROCESSED_VOTE_TYPE {
  APPROVE,
  DENY,
  RELINQUISH,
}

const ProposalCard = ({
  proposal,
  mangoMint,
}: {
  proposal: ProgramAccount<Proposal>
  mangoMint: MintInfo
}) => {
  const connection = mangoStore((s) => s.connection)
  const client = mangoStore((s) => s.client)
  const governances = GovernanceStore((s) => s.governances)
  const wallet = useWallet()
  const voter = GovernanceStore((s) => s.voter)
  const vsrClient = GovernanceStore((s) => s.vsrClient)
  const updateProposals = GovernanceStore((s) => s.updateProposals)

  const [processedVoteType, setProcessedVoteType] = useState<
    PROCESSED_VOTE_TYPE | ''
  >('')
  const [voteRecordAddress, setVoteRecordAddress] = useState<PublicKey | null>(
    null
  )
  const [isVoteCast, setIsVoteCast] = useState(false)

  const governance =
    governances && governances[proposal.account.governance.toBase58()]
  const canVote = voter.voteWeight.cmp(new BN(1)) !== -1

  //Approve 0, deny 1
  const vote = async (voteType: VoteKind) => {
    setProcessedVoteType(
      voteType === VoteKind.Approve
        ? PROCESSED_VOTE_TYPE.APPROVE
        : PROCESSED_VOTE_TYPE.DENY
    )
    try {
      await castVote(
        connection,
        wallet,
        proposal,
        voter.tokenOwnerRecord!,
        voteType,
        vsrClient!,
        client
      )
      await updateProposals(proposal.pubkey)
    } catch (e) {
      notify({
        title: 'Error',
        description: `${e}`,
        type: 'error',
      })
    }

    setProcessedVoteType('')
  }

  const submitRelinquishVote = async () => {
    setProcessedVoteType(PROCESSED_VOTE_TYPE.RELINQUISH)
    try {
      await relinquishVote(
        connection,
        wallet,
        proposal,
        voter.tokenOwnerRecord!,
        client,
        voteRecordAddress!
      )
      await updateProposals(proposal.pubkey)
    } catch (e) {
      notify({
        title: 'Error',
        description: `${e}`,
        type: 'error',
      })
    }
    setProcessedVoteType('')
  }

  useEffect(() => {
    const handleGetVoteRecord = async () => {
      setIsVoteCast(false)
      const voteRecordAddress = await getVoteRecordAddress(
        MANGO_GOVERNANCE_PROGRAM,
        proposal.pubkey,
        voter.tokenOwnerRecord!.pubkey!
      )
      setVoteRecordAddress(voteRecordAddress)
      try {
        await getGovernanceAccount(connection, voteRecordAddress, VoteRecord)
        setIsVoteCast(true)
      } catch (e) {
        setIsVoteCast(false)
      }
    }
    if (voter.tokenOwnerRecord?.pubkey.toBase58()) {
      handleGetVoteRecord()
    } else {
      setVoteRecordAddress(null)
      setIsVoteCast(false)
    }
  }, [
    voter.tokenOwnerRecord?.pubkey.toBase58(),
    proposal.pubkey.toBase58(),
    wallet.publicKey?.toBase58(),
  ])

  return governance ? (
    <div
      className="rounded-lg border border-th-bkg-3 p-4 md:p-6"
      key={proposal.pubkey.toBase58()}
    >
      <div className="mb-6 flex flex-col md:flex-row md:items-start md:justify-between">
        <div className="pr-6">
          <h2 className="mb-2 text-lg md:text-xl">
            <a
              href={`https://dao.mango.markets/dao/MNGO/proposal/${proposal.pubkey.toBase58()}`}
            >
              <span className="mr-2">{proposal.account.name}</span>
              <ArrowTopRightOnSquareIcon className="mb-1 inline-block h-4 w-4 flex-shrink-0" />
            </a>
          </h2>
          <p className="mb-2 md:mb-0">{proposal.account.descriptionLink}</p>
        </div>
        <VoteCountdown
          proposal={proposal.account}
          governance={governance.account}
        />
      </div>
      <div>
        {!isVoteCast ? (
          <div className="flex space-x-4">
            <Button
              className="w-32"
              onClick={() => vote(VoteKind.Approve)}
              disabled={!canVote || processedVoteType !== ''}
              secondary
            >
              <div className="flex flex-row items-center justify-center">
                <HandThumbUpIcon className="mr-2 h-4 w-4" />
                {processedVoteType === PROCESSED_VOTE_TYPE.APPROVE ? (
                  <Loading className="w-3"></Loading>
                ) : (
                  'Vote Yes'
                )}
              </div>
            </Button>
            <Button
              className="w-32"
              onClick={() => vote(VoteKind.Deny)}
              disabled={!canVote || processedVoteType !== ''}
              secondary
            >
              <div className="flex flex-row items-center justify-center">
                <HandThumbDownIcon className="mr-2 h-4 w-4" />
                {processedVoteType === PROCESSED_VOTE_TYPE.DENY ? (
                  <Loading className="w-3"></Loading>
                ) : (
                  'Vote No'
                )}
              </div>
            </Button>
          </div>
        ) : (
          <Button
            disabled={processedVoteType !== ''}
            secondary
            onClick={() => submitRelinquishVote()}
          >
            {processedVoteType === PROCESSED_VOTE_TYPE.RELINQUISH ? (
              <Loading className="w-3"></Loading>
            ) : (
              'Relinquish Vote'
            )}
          </Button>
        )}
      </div>
      {mangoMint && (
        <div className="mt-6 flex w-full flex-col space-y-4 border-t border-th-bkg-3 pt-4 md:flex-row md:space-y-0 md:space-x-6">
          <VoteResults communityMint={mangoMint} proposal={proposal.account} />
          <QuorumProgress
            proposal={proposal}
            governance={governance}
            communityMint={mangoMint}
          />
        </div>
      )}
    </div>
  ) : null
}

export default ProposalCard