import { NodeSDK } from "@opentelemetry/sdk-node";
import {
    ConsoleSpanExporter,
    SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";

new NodeSDK({
    // console version
    spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
}).start();
