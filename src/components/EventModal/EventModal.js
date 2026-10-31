// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useTranslation } = require('react-i18next');
const { default: Button } = require('stremio/components/Button');
const ModalDialog = require('stremio/components/ModalDialog');
const useEvents = require('./useEvents');
const styles = require('./styles');
const { default: Icon } = require('stremio/components/BrandIcons');

const EventModal = () => {
    const { t } = useTranslation();

    const { events, pullEvents, dismissEvent } = useEvents();

    const modal = React.useMemo(() => {
        if (events?.modal?.type !== 'Ready') {
            return null;
        }
        const content = events.modal.content;
        const msg = `${content?.title || ''} ${content?.message || ''}`;
        if (/addon\s+requires\s+configuration|configuration\s+required|requires\s+configuration/i.test(msg)) {
            return null;
        }
        return content;
    }, [events]);

    const onClose = React.useCallback(() => {
        modal?.id && dismissEvent(modal.id);
    }, [modal]);

    React.useEffect(() => {
        pullEvents();
    }, []);

    return (
        modal !== null ?
            <ModalDialog className={styles['event-modal']} onCloseRequest={onClose}>
                {
                    modal.imageUrl ?
                        <img className={styles['image']} src={modal.imageUrl} />
                        :
                        null
                }
                <div className={styles['info-container']}>
                    <div className={styles['title-container']}>
                        {
                            modal.title ?
                                <div className={styles['title']}>{modal.title}</div>
                                :
                                null
                        }
                        {
                            modal.message ?
                                <div className={styles['label']}>{modal.message}</div>
                                :
                                null
                        }
                    </div>
                    {
                        modal?.addon?.name ?
                            <div className={styles['addon-container']}>
                                <Icon className={styles['icon']} name={'addons'} />
                                <div className={styles['name']}>
                                    { modal.addon.name }
                                </div>
                            </div>
                            :
                            null
                    }
                    {
                        modal.externalUrl ?
                            <Button className={styles['action-button']} href={modal.externalUrl} target={'_blank'}>
                                <div className={styles['button-label']}>
                                    { t('LEARN_MORE') }
                                </div>
                            </Button>
                            :
                            null
                    }
                </div>
            </ModalDialog>
            :
            null
    );
};

module.exports = EventModal;
