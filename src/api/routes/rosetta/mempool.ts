import * as express from 'express';
import { asyncHandler } from '../../async-handler';
import { PgStore } from '../../../datastore/pg-store';
import { has0xPrefix } from '../../../helpers';
import { parseLimitQuery } from '../../pagination';
import { rosettaValidateRequest, ValidSchema, makeRosettaError } from '../../rosetta-validate';
import {
  RosettaMempoolResponse,
  RosettaMempoolTransactionResponse,
  RosettaTransaction,
} from '@stacks/stacks-blockchain-api-types';
import { getOperations, parseTransactionMemo } from '../../../rosetta-helpers';
import { RosettaErrors, RosettaErrorsTypes } from '../../rosetta-constants';
import { ChainID } from '@stacks/transactions';

const MAX_MEMPOOL_TXS_PER_REQUEST = 200;
const parseMempoolTxQueryLimit = parseLimitQuery({
  maxItems: MAX_MEMPOOL_TXS_PER_REQUEST,
  errorMsg: `'limit' must be equal to or less than ${MAX_MEMPOOL_TXS_PER_REQUEST}`,
});

export function createRosettaMempoolRouter(db: PgStore, chainId: ChainID): express.Router {
  const router = express.Router();
  router.use(express.json());

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const valid: ValidSchema = await rosettaValidateRequest(req.originalUrl, req.body, chainId);
      if (!valid.valid) {
        res.status(400).json(makeRosettaError(valid));
        return;
      }

      const { results: txResults } = await db.getMempoolTxList({
        limit: Number.MAX_SAFE_INTEGER,
        offset: 0,
        includeUnanchored: false,
      });

      const transaction_identifiers = txResults.map(tx => {
        return { hash: tx.tx_id };
      });
      const response: RosettaMempoolResponse = {
        transaction_identifiers,
      };
      res.json(response);
    })
  );

  router.post(
    '/transaction',
    asyncHandler(async (req, res) => {
      const valid: ValidSchema = await rosettaValidateRequest(req.originalUrl, req.body, chainId);
      if (!valid.valid) {
        res.status(400).json(makeRosettaError(valid));
        return;
      }

      let tx_id: string = req.body.transaction_identifier.hash;

      if (!has0xPrefix(tx_id)) {
        tx_id = '0x' + tx_id;
      }
      await db
        .sqlTransaction(async sql => {
          const mempoolTxQuery = await db.getMempoolTx({
            txId: tx_id,
            includeUnanchored: false,
          });

          if (!mempoolTxQuery.found) {
            throw RosettaErrors[RosettaErrorsTypes.transactionNotFound];
          }

          const operations = await getOperations(mempoolTxQuery.result, db, chainId);
          const txMemo = parseTransactionMemo(mempoolTxQuery.result);
          const transaction: RosettaTransaction = {
            transaction_identifier: { hash: tx_id },
            operations: operations,
          };
          if (txMemo) {
            transaction.metadata = {
              memo: txMemo,
            };
          }
          const result: RosettaMempoolTransactionResponse = {
            transaction: transaction,
          };
          return result;
        })
        .then(result => {
          res.json(result);
        })
        .catch(error => {
          res.status(400).json(error);
        });
    })
  );

  return router;
}
