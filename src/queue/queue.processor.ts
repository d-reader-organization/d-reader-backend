import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { MintParams } from 'src/candy-machine/dto/mint-params.dto';
import { UserPayload } from 'src/auth/dto/authorization.dto';
import { publicKey } from '@metaplex-foundation/umi';
import { WebSocketGateway } from 'src/websockets/websocket.gateway';

@Processor('requestsQueue')
export class QueueProcessor {
  constructor(
    private readonly candyMachineService: CandyMachineService,
    private readonly socket: WebSocketGateway,
  ) {}
  @Process()
  async handleJob(job: Job) {
    // Your actual job logic, e.g., processing the request
    console.log('Processing job', job);
    const { query, user }: { query: MintParams; user?: UserPayload } = job.data;
    const minterAddress = publicKey(query.minterAddress);
    const candyMachineAddress = publicKey(query.candyMachineAddress);
    const { couponId, label } = query;
    const numberOfItems = query.numberOfItems ? +query.numberOfItems : 1;

    const transaction = await this.candyMachineService.createMintTransaction(
      minterAddress,
      candyMachineAddress,
      label,
      couponId,
      numberOfItems,
      user?.id,
    );
    console.log('transaction: ', transaction);
    this.socket.emitMintTransactionResponse(job.id.toString(), transaction);
  }
}
