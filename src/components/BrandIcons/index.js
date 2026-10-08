// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const About = require('./icons/about');
const Actors = require('./icons/actors');
const Add = require('./icons/add');
const AddToLibrary = require('./icons/add-to-library');
const Addons = require('./icons/addons');
const AudioTracks = require('./icons/audio-tracks');
const Bin = require('./icons/bin');
const Calendar = require('./icons/calendar');
const CalendarOutline = require('./icons/calendar-outline');
const CalendarThin = require('./icons/calendar-thin');
const CaretDown = require('./icons/caret-down');
const CaretLeft = require('./icons/caret-left');
const CaretRight = require('./icons/caret-right');
const Cast = require('./icons/cast');
const Channels = require('./icons/channels');
const Checkmark = require('./icons/checkmark');
const ChevronBack = require('./icons/chevron-back');
const ChevronForward = require('./icons/chevron-forward');
const Clock = require('./icons/clock');
const Close = require('./icons/close');
const CloudLibrary = require('./icons/cloud-library');
const Details = require('./icons/details');
const Discord = require('./icons/discord');
const Discover = require('./icons/discover');
const DiscoverOutline = require('./icons/discover-outline');
const Download = require('./icons/download');
const Episodes = require('./icons/episodes');
const Eye = require('./icons/eye');
const EyeOff = require('./icons/eye-off');
const Facebook = require('./icons/facebook');
const Filters = require('./icons/filters');
const Glasses = require('./icons/glasses');
const Hdr = require('./icons/hdr');
const Heart = require('./icons/heart');
const HeartOutline = require('./icons/heart-outline');
const Home = require('./icons/home');
const HomeOutline = require('./icons/home-outline');
const IcAdult = require('./icons/ic_adult');
const IcBook = require('./icons/ic_book');
const IcBrokenLink = require('./icons/ic_broken_link');
const IcDownloads = require('./icons/ic_downloads');
const IcGames = require('./icons/ic_games');
const IcMusic = require('./icons/ic_music');
const IcPodcast = require('./icons/ic_podcast');
const IcRadio = require('./icons/ic_radio');
const Imdb = require('./icons/imdb');
const ImdbOutline = require('./icons/imdb-outline');
const Library = require('./icons/library');
const LibraryOutline = require('./icons/library-outline');
const Link = require('./icons/link');
const Macos = require('./icons/macos');
const MagnetLink = require('./icons/magnet-link');
const Maximize = require('./icons/maximize');
const Megaphone = require('./icons/megaphone');
const Minimize = require('./icons/minimize');
const MoreHorizontal = require('./icons/more-horizontal');
const MoreVertical = require('./icons/more-vertical');
const Movies = require('./icons/movies');
const Network = require('./icons/network');
const Next = require('./icons/next');
const Pause = require('./icons/pause');
const Person = require('./icons/person');
const PersonOutline = require('./icons/person-outline');
const Play = require('./icons/play');
const Reddit = require('./icons/reddit');
const Remote = require('./icons/remote');
const Remove = require('./icons/remove');
const RemoveFromLibrary = require('./icons/remove-from-library');
const Reset = require('./icons/reset');
const Search = require('./icons/search');
const Series = require('./icons/series');
const Settings = require('./icons/settings');
const SettingsOutline = require('./icons/settings-outline');
const Share = require('./icons/share');
const Speed = require('./icons/speed');
const Subtitles = require('./icons/subtitles');
const Symbol = require('./icons/symbol');
const ThumbsUp = require('./icons/thumbs-up');
const ThumbsUpOutline = require('./icons/thumbs-up-outline');
const Trailer = require('./icons/trailer');
const Trakt = require('./icons/trakt');
const Tv = require('./icons/tv');
const VideoScaleCrop = require('./icons/video-scale-crop');
const VideoScaleFit = require('./icons/video-scale-fit');
const VideoScaleStretch = require('./icons/video-scale-stretch');
const Vlc = require('./icons/vlc');
const VolumeHigh = require('./icons/volume-high');
const VolumeLow = require('./icons/volume-low');
const VolumeMedium = require('./icons/volume-medium');
const VolumeMute = require('./icons/volume-mute');
const VolumeOff = require('./icons/volume-off');
const X = require('./icons/x');

const ICONS = {
    'about': About,
    'actors': Actors,
    'add': Add,
    'add-to-library': AddToLibrary,
    'addons': Addons,
    'audio-tracks': AudioTracks,
    'bin': Bin,
    'calendar': Calendar,
    'calendar-outline': CalendarOutline,
    'calendar-thin': CalendarThin,
    'caret-down': CaretDown,
    'caret-left': CaretLeft,
    'caret-right': CaretRight,
    'cast': Cast,
    'channels': Channels,
    'checkmark': Checkmark,
    'chevron-back': ChevronBack,
    'chevron-forward': ChevronForward,
    'clock': Clock,
    'close': Close,
    'cloud-library': CloudLibrary,
    'details': Details,
    'discord': Discord,
    'discover': Discover,
    'discover-outline': DiscoverOutline,
    'download': Download,
    'episodes': Episodes,
    'eye': Eye,
    'eye-off': EyeOff,
    'facebook': Facebook,
    'filters': Filters,
    'glasses': Glasses,
    'hdr': Hdr,
    'heart': Heart,
    'heart-outline': HeartOutline,
    'home': Home,
    'home-outline': HomeOutline,
    'ic_adult': IcAdult,
    'ic_book': IcBook,
    'ic_broken_link': IcBrokenLink,
    'ic_downloads': IcDownloads,
    'ic_games': IcGames,
    'ic_music': IcMusic,
    'ic_podcast': IcPodcast,
    'ic_radio': IcRadio,
    'imdb': Imdb,
    'imdb-outline': ImdbOutline,
    'library': Library,
    'library-outline': LibraryOutline,
    'link': Link,
    'macos': Macos,
    'magnet-link': MagnetLink,
    'maximize': Maximize,
    'megaphone': Megaphone,
    'minimize': Minimize,
    'more-horizontal': MoreHorizontal,
    'more-vertical': MoreVertical,
    'movies': Movies,
    'network': Network,
    'next': Next,
    'pause': Pause,
    'person': Person,
    'person-outline': PersonOutline,
    'play': Play,
    'reddit': Reddit,
    'remote': Remote,
    'remove': Remove,
    'remove-from-library': RemoveFromLibrary,
    'reset': Reset,
    'search': Search,
    'series': Series,
    'settings': Settings,
    'settings-outline': SettingsOutline,
    'share': Share,
    'speed': Speed,
    'subtitles': Subtitles,
    'symbol': Symbol,
    'thumbs-up': ThumbsUp,
    'thumbs-up-outline': ThumbsUpOutline,
    'trailer': Trailer,
    'trakt': Trakt,
    'tv': Tv,
    'video-scale-crop': VideoScaleCrop,
    'video-scale-fit': VideoScaleFit,
    'video-scale-stretch': VideoScaleStretch,
    'vlc': Vlc,
    'volume-high': VolumeHigh,
    'volume-low': VolumeLow,
    'volume-medium': VolumeMedium,
    'volume-mute': VolumeMute,
    'volume-off': VolumeOff,
    'x': X,
};

const BrandIcon = React.forwardRef(({ name, className }, ref) => {
    const C = ICONS[name];
    if (!C) {
        return null;
    }
    return React.createElement(C, { className: className, ref: ref });
});

BrandIcon.displayName = 'BrandIcon';

BrandIcon.propTypes = {
    name: PropTypes.string,
    className: PropTypes.string
};

module.exports = BrandIcon;
module.exports.default = BrandIcon;
module.exports.ICONS = ICONS;
