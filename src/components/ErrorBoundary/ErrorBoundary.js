// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Fault precedence: failures are contained at the nearest boundary so one
// broken subsystem can never blank the whole app.
//
//   P0 shell   — BrandingProvider children: a crash here shows the fallback
//                panel instead of unmounting the app.
//   P1 routes  — each router view is wrapped: a crashing Board/Player/Admin
//                shows a reload fallback; nav shell and other views survive.
//   P2 widgets — Billboard/AdSlot/admin forms: already fail-silent by
//                contract; boundaries only where they render third-party
//                content.
// Rule: data-fetch failures must NEVER throw (return defaults); only
// unexpected render exceptions reach these boundaries.
const React = require('react');
const PropTypes = require('prop-types');

const STR = {
    title: 'Something went wrong here',
    body: 'This section failed to render. The rest of the app is unaffected.',
    reload: 'Reload',
};

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error) {
        try {
            console.warn(`[boundary:${this.props.name || 'unnamed'}]`, error);
        } catch {
            // Logging must never throw.
        }
    }

    render() {
        if (this.state.failed) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className={'lx-error-fallback'} role={'alert'}>
                    <div>{STR.title}</div>
                    <div>{STR.body}</div>
                    <button onClick={() => window.location.reload()}>{STR.reload}</button>
                </div>
            );
        }
        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node,
    fallback: PropTypes.node,
    name: PropTypes.string,
};

module.exports = ErrorBoundary;
