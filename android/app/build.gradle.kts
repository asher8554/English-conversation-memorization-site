plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}
android {
    namespace = "com.asher.englishstudy"
    compileSdk = 37
    defaultConfig {
        applicationId = "com.asher.englishstudy"
        minSdk = 31
        targetSdk = 37
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    buildFeatures { compose = true }
    buildTypes { debug { applicationIdSuffix = ".debug" } }
    val signingFolder = rootProject.file(".tools/signing")
    if (signingFolder.resolve("english-study.jks").exists()) {
        signingConfigs.create("personal") {
            storeFile = signingFolder.resolve("english-study.jks")
            storePassword = signingFolder.resolve("password").readText().trim()
            keyAlias = "english-study"
            keyPassword = storePassword
        }
        buildTypes.getByName("release").signingConfig = signingConfigs.getByName("personal")
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/study-assets").get().asFile)
}
val prepareStudyData = tasks.register<Copy>("prepareStudyData") {
    from(rootProject.file("../data.json"))
    into(layout.buildDirectory.dir("generated/study-assets"))
}
tasks.named("preBuild") { dependsOn(prepareStudyData) }
dependencies {
    implementation(platform("androidx.compose:compose-bom:2026.09.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.11.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20250517")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test:runner:1.7.0")
    // Android 17에서 제거된 InputManager 반사 호출을 사용하지 않는 테스트 버전이다.
    androidTestImplementation("androidx.test.espresso:espresso-core:3.8.0-alpha01")
    androidTestImplementation(platform("androidx.compose:compose-bom:2026.09.00"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
