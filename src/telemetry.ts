import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
    ATTR_SERVICE_NAME,
    ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import {
    ConsoleSpanExporter,
    SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { propagation, trace } from "@opentelemetry/api";
import { W3CTraceContextPropagator } from "@opentelemetry/core";

const serviceName = "sse-bridge";

new NodeSDK({
    resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: serviceName,
        [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "1.0.0",
    }),
    spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
}).start();

// need it, to get trace from cloud events
propagation.setGlobalPropagator(new W3CTraceContextPropagator());

// instrumentation scope (since single service in this app, we have single instrumentation)
export const tracer = trace.getTracer(serviceName);
