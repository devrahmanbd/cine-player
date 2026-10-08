// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Banner/native ad slot. Renders nothing when the slot is disabled, empty or
// blocked. Injects stored code into its own container only; cleans up on
// unmount or toggle-off. Never touches player or navigation.
const React = require('react');
const PropTypes = require('prop-types');
const { useBranding } = require('../../branding/BrandingContext');

function appendCode(container, code) {
    const template = document.createElement('template');
    template.innerHTML = code;
    // Clone non-script markup verbatim, then execute ALL scripts (including
    // nested ones — cloned <script> nodes never run on their own).
    for (const node of Array.from(template.content.childNodes)) {
        if (node.tagName === 'SCRIPT') continue;
        if (node.nodeType === 1) container.appendChild(node.cloneNode(true));
    }
    for (const node of Array.from(template.content.querySelectorAll('script'))) {
        const script = document.createElement('script');
        for (const attr of Array.from(node.attributes)) {
            script.setAttribute(attr.name, attr.value);
        }
        script.setAttribute('data-adslot', 'slot');
        script.async = true;
        if (node.src) script.setAttribute('src', node.src);
        else script.text = node.textContent;
        container.appendChild(script);
    }
}

const AdSlot = ({ slot, className }) => {
    const { ads, ready } = useBranding();
    const ref = React.useRef(null);
    const entry = ads[slot];
    const code = entry && entry.code;
    const active = ready && entry && entry.enabled && code;

    React.useEffect(() => {
        const container = ref.current;
        if (!container) return undefined;
        container.replaceChildren();
        if (!active) return undefined;
        try {
            appendCode(container, code);
        } catch {
            container.replaceChildren();
        }
        return () => container.replaceChildren();
    }, [active, code, slot]);

    if (!active) return null;
    return <div ref={ref} className={className} data-adslot={slot} />;
};

AdSlot.propTypes = {
    slot: PropTypes.string.isRequired,
    className: PropTypes.string,
};

module.exports = AdSlot;
