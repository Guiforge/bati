package expo.modules.batisave

/**
 * Whether the size a provider reports after a save proves bytes went missing, which deletes the
 * document. Null is a provider that never says; 0 is one still uploading (Drive): a POCO on 2.13.1
 * lost two good backups of 434176 bytes to it. No Android in here, so the JVM tests reach it.
 */
internal fun sizeProvesLoss(
  reported: Long?,
  written: Long,
): Boolean = reported != null && reported != 0L && reported != written
