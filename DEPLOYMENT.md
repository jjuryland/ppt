# Team MVP Deployment

목표는 로그인 없이 소수 팀원이 같은 URL에서 페이지네이션과 장표 레퍼런스를 공유해 테스트하는 것입니다.

## 1. Supabase 준비

1. Supabase 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/schema.sql`을 실행합니다.
3. Project Settings > API에서 아래 값을 복사합니다.
   - Project URL
   - anon public key

주의: `schema.sql`은 빠른 내부 MVP용입니다. URL이 외부에 노출되면 누구나 읽기/쓰기/삭제가 가능하므로 민감 자료는 올리지 마세요. 장기 운영은 `supabase/team_schema.sql` 방향으로 Auth와 `team_id`를 붙여야 합니다.

## 2. Vercel 배포

1. GitHub에 이 프로젝트를 올립니다.
2. Vercel에서 새 프로젝트로 import합니다.
3. Environment Variables에 아래 값을 넣습니다.

```env
NEXT_PUBLIC_SUPABASE_URL=Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=Supabase anon public key
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=slide-references
OPENAI_API_KEY=팀 공용 OpenAI API 키
OPENAI_ANALYSIS_MODEL=gpt-4o-mini
```

4. Deploy를 실행합니다.

## 3. 팀 테스트 방식

1. 팀원에게 Vercel URL을 공유합니다.
2. GPTs가 만든 페이지네이션을 왼쪽 입력창에 붙여넣습니다.
3. `미리보기`로 파싱 결과를 확인합니다.
4. `확인 후 반영`으로 페이지 목록을 만듭니다.
5. 페이지를 클릭하고 추천 장표에서 `이 페이지에 적용`을 누릅니다.
6. 오른쪽 GPT 프롬프트를 복사해 장표 제작에 사용합니다.

## 4. 현재 MVP 제한

- 로그인/권한이 없습니다.
- 페이지/섹션은 공유 상태에서 동시 편집 충돌이 날 수 있습니다.
- 장표/디자인 레퍼런스는 다른 팀원이 추가한 항목을 보존하도록 저장하지만, 완전한 협업 충돌 처리는 아직 없습니다.
- OpenAI API는 서버 키를 사용하므로 비용은 팀 공용 키에 누적됩니다.
