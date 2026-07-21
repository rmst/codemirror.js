import { MessageReader, MessageWriter, Logger, ConnectionStrategy, ConnectionOptions, ProtocolConnection } from '../common/api';
export * from '../../../vscode-jsonrpc/lib/browser/main.js';
export * from '../common/api';
export declare function createProtocolConnection(reader: MessageReader, writer: MessageWriter, logger?: Logger, options?: ConnectionStrategy | ConnectionOptions): ProtocolConnection;
