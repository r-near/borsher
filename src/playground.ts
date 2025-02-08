import { BorshSchema, type Unit } from './schema';

type Status =
  | {
      Pending: Unit;
    }
  | {
      Fulfilled: Unit;
    }
  | {
      Rejected: Unit;
    };

const statusSchema = BorshSchema.Enum({
  Pending: BorshSchema.Unit,
  Fulfilled: BorshSchema.Unit,
  Rejected: BorshSchema.Unit,
});

const status: Status = {
  Rejected: {},
};

const result = statusSchema.serialize(status);
console.log(result);
