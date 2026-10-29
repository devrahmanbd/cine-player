// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Pure decision logic for the newsletter popup visibility.
//
// The popup must NOT render while another modal is open: app modals are
// wrapped in react-focus-lock, and a lock that mounts after the popup takes
// precedence, pulling focus back from the popup's email input on every click
// (input becomes impossible to type into). Waiting until all modals are
// closed lets the popup mount as the newest lock and keep focus.
const canShowPopup = ({ dismissed, openModals }) => !dismissed && openModals === 0;

module.exports = { canShowPopup };
