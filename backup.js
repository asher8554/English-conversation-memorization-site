// 삼성 인터넷의 학습 기록과 설정만 JSON 파일로 내보낸다.
const STUDY_BACKUP_KEYS = [
    'reviewStats', 'reviewStats:conversation', 'reviewStats:basic-verbs', 'lastCompletedChapter',
    'selectedCourseId', 'questionFontSize', 'answerFontSize', 'useDarkMode', 'koVoiceURI', 'enVoiceURI',
    'koVoiceName', 'enVoiceName', 'ttsAutoQuestion', 'ttsAutoAnswer', 'ttsKoRate', 'ttsEnRate'
];

function buildStudyBackup(storage, now = new Date()) {
    const values = {};
    for (const key of STUDY_BACKUP_KEYS) {
        const value = storage.getItem(key);
        if (value !== null) values[key] = value;
    }
    if (Object.keys(values).length === 0) throw new Error('내보낼 학습 기록과 설정이 없습니다.');
    return { format: 'english-study-backup', version: 1, exportedAt: now.toISOString(), values };
}

if (typeof module !== 'undefined') module.exports = { buildStudyBackup, STUDY_BACKUP_KEYS };

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('exportBackupBtn')?.addEventListener('click', () => {
            let url;
            try {
                const backup = buildStudyBackup(window.localStorage);
                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
                url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `english-study-backup-${backup.exportedAt.slice(0, 10)}.json`;
                document.body.appendChild(link);
                link.click();
                link.remove();
            } catch (error) {
                alert(`기록을 내보내지 못했습니다. ${error.message}`);
            } finally {
                if (url) setTimeout(() => URL.revokeObjectURL(url), 30000);
            }
        });
    });
}
