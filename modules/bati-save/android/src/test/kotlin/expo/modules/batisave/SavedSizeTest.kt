package expo.modules.batisave

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SavedSizeTest {
  @Test
  fun aMatchingSizeIsASave() = assertFalse(sizeProvesLoss(434176, 434176))

  @Test
  fun aProviderThatNeverSaysIsTrusted() = assertFalse(sizeProvesLoss(null, 434176))

  @Test
  fun aZeroIsAnUploadStillGoing() = assertFalse(sizeProvesLoss(0, 434176))

  @Test
  fun aShortFileIsALoss() = assertTrue(sizeProvesLoss(4096, 434176))

  @Test
  fun aLongerFileIsALoss() = assertTrue(sizeProvesLoss(500000, 434176))
}
