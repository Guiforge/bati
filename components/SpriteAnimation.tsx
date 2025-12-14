import { useEffect, useState } from "react";
import { Image, type ImageSourcePropType, type ImageStyle, View } from "react-native";

interface SpriteAnimationProps {
    source: ImageSourcePropType;
    frameCount: number;
    frameWidth: number;
    frameHeight: number;
    fps?: number;
    scale?: number;
}

export function SpriteAnimation({
    source,
    frameCount,
    frameWidth,
    frameHeight,
    fps = 10,
    scale = 1,
}: SpriteAnimationProps) {
    const [currentFrame, setCurrentFrame] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentFrame((prev) => (prev + 1) % frameCount);
        }, 1000 / fps);

        return () => clearInterval(interval);
    }, [frameCount, fps]);

    const displayWidth = frameWidth * scale;
    const displayHeight = frameHeight * scale;

    const imageStyle: ImageStyle = {
        width: frameWidth * frameCount * scale,
        height: displayHeight,
        marginLeft: -currentFrame * displayWidth,
    };

    return (
        <View style={{ width: displayWidth, height: displayHeight, overflow: "hidden" }}>
            <Image source={source} style={imageStyle} resizeMode="stretch" />
        </View>
    );
}
