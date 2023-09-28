import * as PIXI from 'pixi.js';
import { lerpPoint } from './gameLogic';

export async function shake(app: PIXI.Application, sprite: PIXI.DisplayObject, time: number) {
    const origin = sprite.position.clone();
    const originalScale = sprite.scale.clone();
    const magnitude = 8;
    let totalTime = 0;
    app.ticker.add(shakeIt);
    let resolver;
    const promise = new Promise((res, rej) => {
        resolver = res;
    });

    let frame = 0;
    let currentTarget: PIXI.Point;
    function shakeIt(t: number) {
        totalTime += t;
        if (totalTime >= time) {
            sprite.position = origin;
            sprite.scale = originalScale
            app.ticker.remove(shakeIt);
            resolver();
        } else {
            if (frame == 0) {
                frame = 1;
                currentTarget = origin.add((new PIXI.Point(Math.random() - 0.5, Math.random() - 0.5)).multiplyScalar(magnitude));
                sprite.position = lerpPoint(origin, currentTarget, 0.5);
            } else {
                sprite.position = currentTarget;
                frame = 0;
            }
        }
    }

    return promise;
}

export type animationCommand = {
    animFunction: (t: number) => void,
    meta: { finished: boolean },
};

export async function animateForTime(animationQueue: animationCommand[], point: PIXI.Point, target: PIXI.Point, time: number) {
    const promise = new Promise<void>((res, rej) => {
        const meta = { finished: false };
        const start = point.clone();
        let passedTime = 0;
        animationQueue.push({
            animFunction: t => {
                passedTime += t;
                if (passedTime >= time) {
                    point.copyFrom(target);
                    meta.finished = true;
                    res();
                    return;
                }
                point.copyFrom(lerpPoint(start, target, Math.min(passedTime, time) / time));
            },
            meta,
        })
    });
    return promise;
}

export async function animateForSpeed(animationQueue: animationCommand[], point: PIXI.Point, target: PIXI.Point, speed: number) {
    const promise = new Promise<void>((res, rej) => {
        const meta = { finished: false };
        const start = point.clone();
        const direction = target.subtract(start).normalize();
        animationQueue.push({
            animFunction: t => {
                if (meta.finished || point.subtract(target).magnitudeSquared() < Math.pow(speed * t, 2)) {
                    point.copyFrom(target);
                    meta.finished = true;
                    res();
                    return;
                }
                point.copyFrom(point.add(direction.multiplyScalar(speed * t)));
            },
            meta,
        })
    });
    return promise;
}