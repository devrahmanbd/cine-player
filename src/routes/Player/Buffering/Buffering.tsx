import React, { forwardRef, useMemo } from 'react';
import classNames from 'classnames';
import { Image } from 'stremio/components';
import Icon from 'stremio/components/BrandIcons';
import styles from './Buffering.less';

type Props = {
    className: string,
    logo: string,
    progress: number,
};

const Buffering = forwardRef<HTMLDivElement, Props>(({ className, logo, progress }, ref) => {
    const style = useMemo(() => {
        return {
            clipPath: `inset(0 ${100 - progress}% 0 0)`,
        };
    }, [progress]);

    return (
        <div ref={ref} className={classNames(className, styles['buffering'])}>
            {
                typeof logo === 'string' && logo.length > 0 ?
                    <React.Fragment>
                        <Image
                            className={styles['logo']}
                            style={style}
                            src={logo}
                            alt={' '}
                            fallbackSrc={'/brand/logo.svg'}
                        />
                        <Image
                            className={classNames(styles['logo'], styles['background'])}
                            src={logo}
                            alt={' '}
                            fallbackSrc={'/brand/logo.svg'}
                        />
                    </React.Fragment>
                    :
                    <Icon className={styles['spinner']} name={'loader'} />
            }
        </div>
    );
});

export default Buffering;
