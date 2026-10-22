// 네이티브 학습 화면에 오프라인 폰트와 배경 블러 유리 패널을 적용한다.
package com.asher.englishstudy

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp

private val Pretendard = FontFamily(Font(R.font.pretendard_regular))

@Composable
fun StudyTheme(dark: Boolean, content: @Composable () -> Unit) {
    val base = Typography()
    fun androidx.compose.ui.text.TextStyle.face() = copy(fontFamily = Pretendard)
    MaterialTheme(colorScheme = if (dark) darkColorScheme(primary = Color(0xFF91E3D3), onPrimary = Color(0xFF07372E),
        background = Color(0xFF101722), surface = Color(0xFF182331), onSurface = Color(0xFFF0F3F7))
        else lightColorScheme(primary = Color(0xFF00695C), surface = Color(0xFFF2F6F8), onSurface = Color(0xFF182736)),
        typography = Typography(displayLarge = base.displayLarge.face(), displayMedium = base.displayMedium.face(),
            displaySmall = base.displaySmall.face(), headlineLarge = base.headlineLarge.face(), headlineMedium = base.headlineMedium.face(),
            headlineSmall = base.headlineSmall.face(), titleLarge = base.titleLarge.face(), titleMedium = base.titleMedium.face(),
            titleSmall = base.titleSmall.face(), bodyLarge = base.bodyLarge.face(), bodyMedium = base.bodyMedium.face(),
            bodySmall = base.bodySmall.face(), labelLarge = base.labelLarge.face(), labelMedium = base.labelMedium.face(),
            labelSmall = base.labelSmall.face())) {
        CompositionLocalProvider(LocalContentColor provides MaterialTheme.colorScheme.onSurface, content = content)
    }
}

private fun DrawScope.backdrop(full: Size, dark: Boolean) {
    drawRect(if (dark) Color(0xFF101722) else Color(0xFFDCEAEF), size = full)
    if (full.width <= 0f) return
    val teal = Offset(full.width * .92f, full.height * .23f)
    val purple = Offset(full.width * .05f, full.height * .76f)
    drawCircle(Brush.radialGradient(listOf(Color(0xFF247F80), Color.Transparent), teal, full.width * .78f), full.width * .78f, teal)
    drawCircle(Brush.radialGradient(listOf(Color(0xFF535185).copy(alpha = .85f), Color.Transparent), purple, full.width * .85f), full.width * .85f, purple)
    drawLine(Color(0xFF99EBDD).copy(alpha = .4f), Offset(full.width * .40f, 0f), Offset(full.width, full.height * .73f), 3.dp.toPx())
    drawCircle(Color(0xFFA6B2EF).copy(alpha = .25f), full.width * .13f, Offset(full.width * .17f, full.height * .38f), style = androidx.compose.ui.graphics.drawscope.Stroke(2.dp.toPx()))
}

@Composable
fun GlassBackground(dark: Boolean, content: @Composable (Size, Offset) -> Unit) {
    var size by remember { mutableStateOf(Size.Zero) }
    var origin by remember { mutableStateOf(Offset.Zero) }
    Box(Modifier.fillMaxSize().onGloballyPositioned {
        size = Size(it.size.width.toFloat(), it.size.height.toFloat()); origin = it.positionInRoot()
    }) {
        Canvas(Modifier.matchParentSize()) { backdrop(size, dark) }
        content(size, origin)
    }
}

@Composable
fun GlassPanel(full: Size, origin: Offset, dark: Boolean, content: @Composable ColumnScope.() -> Unit) {
    var offset by remember { mutableStateOf(Offset.Zero) }
    val shape = RoundedCornerShape(24.dp)
    Box(Modifier.fillMaxWidth().onGloballyPositioned { offset = it.positionInRoot() - origin }
        .clip(shape).border(1.dp, if (dark) Color.White.copy(alpha = .20f) else Color.White.copy(alpha = .7f), shape)) {
        // 패널 뒤 배경만 같은 좌표로 다시 그려 흐리고 콘텐츠는 별도 레이어에 둔다.
        Canvas(Modifier.matchParentSize().blur(22.dp)) { translate(-offset.x, -offset.y) { backdrop(full, dark) } }
        Column(Modifier.fillMaxWidth().background(if (dark) Color(0xFF172333).copy(alpha = .68f) else Color.White.copy(alpha = .80f))
            .padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp), content = content)
    }
}

@Composable
fun focusRing(): Modifier {
    var focused by remember { mutableStateOf(false) }
    return Modifier.onFocusChanged { focused = it.isFocused }.border(if (focused) 2.dp else 0.dp,
        if (focused) MaterialTheme.colorScheme.primary else Color.Transparent, RoundedCornerShape(20.dp))
}
