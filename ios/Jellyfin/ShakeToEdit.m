#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

// Lets JS enable/disable iOS shake-to-undo. It is disabled while the video
// player is shown so a bump doesn't pop up the "Undo Typing" dialog.
@interface ShakeToEdit : NSObject <RCTBridgeModule>
@end

@implementation ShakeToEdit

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_EXPORT_METHOD(setEnabled:(BOOL)enabled)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [UIApplication sharedApplication].applicationSupportsShakeToEdit = enabled;
  });
}

@end
