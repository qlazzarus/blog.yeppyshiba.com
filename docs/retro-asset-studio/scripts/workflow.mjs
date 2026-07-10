import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const widgetInputsByNodeType = {
    Canny: ['low_threshold', 'high_threshold'],
    CheckpointLoaderSimple: ['ckpt_name'],
    CLIPTextEncode: ['text'],
    ControlNetApplyAdvanced: ['strength', 'start_percent', 'end_percent'],
    ControlNetLoader: ['control_net_name'],
    KSampler: ['seed', 'control_after_generate', 'steps', 'cfg', 'sampler_name', 'scheduler', 'denoise'],
    LoadImage: ['image', 'upload'],
    LoraLoader: ['lora_name', 'strength_model', 'strength_clip'],
    SaveImage: ['filename_prefix'],
};

export async function loadJson(filePath) {
    return JSON.parse(await readFile(filePath, 'utf8'));
}

export async function writeJson(filePath, value) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function isComfyUiWorkflow(value) {
    return value && Array.isArray(value.nodes) && Array.isArray(value.links);
}

export function isComfyApiPrompt(value) {
    return value
        && typeof value === 'object'
        && !Array.isArray(value)
        && Object.values(value).every((node) => node && typeof node.class_type === 'string' && node.inputs);
}

export function workflowToApiPrompt(workflow) {
    if (!isComfyUiWorkflow(workflow)) {
        if (isComfyApiPrompt(workflow)) {
            return workflow;
        }

        throw new Error('Expected a ComfyUI workflow JSON or API prompt JSON.');
    }

    const linksById = new Map(workflow.links.map((link) => [link[0], link]));
    const prompt = {};

    for (const node of workflow.nodes) {
        const id = String(node.id);
        const inputs = {};

        for (const input of node.inputs ?? []) {
            if (input.link == null) continue;

            const link = linksById.get(input.link);

            if (!link) {
                throw new Error(`Node ${id} input ${input.name} references missing link ${input.link}`);
            }

            inputs[input.name] = [String(link[1]), link[2]];
        }

        const widgetNames = widgetInputsByNodeType[node.type] ?? [];
        const widgetValues = node.widgets_values ?? [];

        for (let index = 0; index < Math.min(widgetNames.length, widgetValues.length); index += 1) {
            inputs[widgetNames[index]] = widgetValues[index];
        }

        prompt[id] = {
            class_type: node.type,
            inputs,
        };
    }

    return prompt;
}

export function patchRetroPrompt(prompt, config) {
    const patched = structuredClone(prompt);

    patchTextEncodePrompts(patched, config.positivePrompt, config.negativePrompt);

    patchFirstNode(patched, 'CheckpointLoaderSimple', {
        ckpt_name: config.checkpoint,
    });
    patchFirstNode(patched, 'LoraLoader', {
        lora_name: config.lora,
        strength_clip: config.loraStrengthClip,
        strength_model: config.loraStrengthModel,
    });
    patchFirstNode(patched, 'LoadImage', {
        image: config.inputImageName,
    });
    patchFirstNode(patched, 'Canny', {
        high_threshold: config.cannyHigh,
        low_threshold: config.cannyLow,
    });
    patchFirstNode(patched, 'ControlNetLoader', {
        control_net_name: config.controlNet,
    });
    patchFirstNode(patched, 'ControlNetApplyAdvanced', {
        end_percent: config.controlNetEnd,
        start_percent: config.controlNetStart,
        strength: config.controlNetStrength,
    });
    patchFirstNode(patched, 'KSampler', {
        cfg: config.cfg,
        denoise: config.denoise,
        sampler_name: config.sampler,
        scheduler: config.scheduler,
        seed: config.seed,
        steps: config.steps,
    });

    if (config.filenamePrefix) {
        patchFirstNode(patched, 'SaveImage', {
            filename_prefix: config.filenamePrefix,
        });
    }

    return patched;
}

function patchTextEncodePrompts(prompt, positivePrompt, negativePrompt) {
    if (positivePrompt == null && negativePrompt == null) return;

    const textNodes = Object.values(prompt).filter((node) => node.class_type === 'CLIPTextEncode');

    if (textNodes.length < 2) {
        throw new Error('Workflow must include positive and negative CLIPTextEncode nodes.');
    }

    if (positivePrompt != null) textNodes[0].inputs.text = positivePrompt;
    if (negativePrompt != null) textNodes[1].inputs.text = negativePrompt;
}

function patchFirstNode(prompt, classType, values) {
    const entry = Object.values(prompt).find((node) => node.class_type === classType);

    if (!entry) {
        throw new Error(`Workflow is missing ${classType}`);
    }

    for (const [key, value] of Object.entries(values)) {
        if (value !== undefined && value !== null) {
            entry.inputs[key] = value;
        }
    }
}
